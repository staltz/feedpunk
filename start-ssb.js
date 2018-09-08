var ssbKeys = require('ssb-keys')
var ssbConfigInject = require('ssb-config/inject')
var path = require('path')
var makeDHTPlugin = require('multiserver-dht')
var makeNoauthPlugin = require('multiserver/plugins/noauth')

function dhtTransport(sbot) {
  sbot.multiserver.transport({
    name: 'dht',
    create: () => {
      return makeDHTPlugin({ keys: sbot.dhtInvite.channels() })
    },
  })
}

function noauthTransform(sbot, cfg) {
  sbot.multiserver.transform({
    name: 'noauth',
    create: () => {
      return makeNoauthPlugin({
        keys: {
          publicKey: Buffer.from(cfg.keys.public, 'base64'),
        },
      })
    },
  })
}

module.exports = function startSSB() {
  const config = ssbConfigInject()
  config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
  config.connections = {
    incoming: {
      dht: [{ scope: 'public', transform: 'noauth' }],
    },
    outgoing: {
      dht: [{ transform: 'noauth' }],
    },
  }
  config.logging.level = ''
  return (
    require('scuttlebot/index')
      .use(require('./dht-invite'))
      .use(dhtTransport)
      .use(noauthTransform)
      .use(require('scuttlebot/plugins/plugins'))
      .use(require('scuttlebot/plugins/master'))
      .use(require('scuttlebot/plugins/gossip'))
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
      // .use(require('scuttlebot/plugins/local'))
      .call(null, config)
  )
}
