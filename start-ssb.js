var ssbKeys = require('ssb-keys')
var ssbConfigInject = require('ssb-config/inject')
var path = require('path')
var DHT = require('multiserver-dht')

function dhtTransport(sbot) {
  sbot.multiserver.transport({
    name: 'dht',
    create: dhtConfig => {
      return DHT({
        keys: sbot.dhtInvite.channels(),
        port: dhtConfig.port,
      })
    },
  })
}

module.exports = function startSSB() {
  const config = ssbConfigInject()
  config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
  config.connections = {
    incoming: {
      dht: [{ scope: 'public', transform: 'shs', port: 8423 }],
    },
    outgoing: {
      dht: [{ transform: 'shs' }],
    },
  }
  config.logging.level = 'info'
  return (
    require('scuttlebot/index')
      .use(require('ssb-dht-invite'))
      .use(dhtTransport)
      .use(require('scuttlebot/plugins/plugins'))
      .use(require('scuttlebot/plugins/master'))
      .use(require('@staltz/sbot-gossip'))
      .use(require('scuttlebot/plugins/replicate'))
      .use(require('ssb-friends'))
      .use(require('ssb-blobs'))
      .use(require('ssb-serve-blobs'))
      .use(require('ssb-backlinks'))
      .use(require('ssb-private'))
      .use(require('ssb-about'))
      .use(require('ssb-contacts'))
      .use(require('ssb-query'))
      .use(require('scuttlebot/plugins/invite'))
      .use(require('scuttlebot/plugins/logging'))
      //.use(require('scuttlebot/plugins/local'))
      .call(null, config)
  )
}
