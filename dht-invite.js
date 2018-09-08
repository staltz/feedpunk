var crypto = require('crypto')
var Pushable = require('pull-pushable')
var explain = require('explain-error')
// var ssbClient = require('ssb-client')
var MultiServer = require('multiserver')
var makeSHSTransform = require('multiserver/plugins/shs')
var makeDHTTransport = require('multiserver-dht')
var muxrpc = require('muxrpc')
var pull = require('pull-stream')

function toSodiumKeys(keys) {
  if (!keys || !keys.public) return null
  return {
    publicKey: new Buffer(keys.public.replace('.ed25519', ''), 'base64'),
    secretKey: new Buffer(keys.private.replace('.ed25519', ''), 'base64'),
  }
}

function dhtClient(opts, cb) {
  var dht = makeDHTTransport({})
  var shs = makeSHSTransform({
    keys: toSodiumKeys(opts.keys),
    appKey: opts.caps,
    //no client auth. we can't receive connections anyway.
    auth: function(cb) {
      cb(null, false)
    },
    timeout: 6000,
  })
  var ms = MultiServer([[dht, shs]])

  ms.client(opts.addr, function(err, stream) {
    if (err) return cb(explain(err, 'could not connect to sbot over DHT'))
    var sbot = muxrpc(opts.manifest, false)()
    sbot.id = '@' + stream.remote.toString('base64') + '.ed25519'
    // // fix blobs.add. (see ./blobs.js)
    // if (sbot.blobs && sbot.blobs.add)
    //   sbot.blobs.add = fixBlobsAdd(sbot.blobs.add)
    pull(stream, sbot.createStream(), stream)
    cb(null, sbot)
  })
}

module.exports = {
  name: 'dhtInvite',
  version: '1.0.0',
  manifest: {
    start: 'async',
    create: 'async',
    use: 'async',
    channels: 'source',
    accept: 'async',
  },
  permissions: {
    master: { allow: ['create'] },
  },
  init: function(sbot, config) {
    var channelsSource = Pushable()
    var codesDB = null
    return {
      start: function() {
        if (codesDB) return
        codesDB = sbot.sublevel('dhtcodes')
        codesDB
          .createReadStream({ keys: true, values: false })
          .on('data', function(seed) {
            var channel = seed + ':' + sbot.id
            channelsSource.push(channel)
          })
      },

      create: function(cb) {
        //#region preconditions
        if (!codesDB) {
          return cb(
            new Error('Cannot call dhtInvite.create() before dhtInvite.start()')
          )
        }
        //#endregion
        var seed = crypto.randomBytes(32).toString('base64')
        var invite = { used: false }
        codesDB.put(seed, invite, function(err) {
          //#region preconditions
          if (err) return cb(err)
          //#endregion
          var channel = seed + ':' + sbot.id
          cb(null, 'dht:' + channel)
          channelsSource.push(channel)
        })
      },

      use: function(req, cb) {
        //#region preconditions
        if (!codesDB) {
          return cb(
            new Error('Cannot call dhtInvite.use() before dhtInvite.start()')
          )
        }
        //#endregion
        codesDB.get(req.seed, function(err, invite) {
          //#region preconditions
          if (err) {
            return cb(
              explain(err, 'Cannot `use` an invite that does not exist')
            )
          }
          if (invite.used) {
            return cb(new Error('Cannot `use` an already used invite'))
          }
          //#endregion
          invite.used = true
          codesDB.put(req.seed, invite, function(err) {
            //#region preconditions
            if (err) return cb(err)
            //#endregion
            sbot.publish(
              { type: 'contact', contact: req.feed, following: true },
              cb
            )
          })
        })
      },

      channels: function() {
        return channelsSource
      },

      accept: function(invite, cb) {
        var seed, remoteId
        //#region parse the invite
        if (typeof invite !== 'string' || invite.length === 0) {
          return cb(new Error('Cannot `accept` the DHT invite, it is missing'))
        }
        var parts = invite.split(':')
        if (parts.length !== 3) {
          return cb(
            new Error(
              'Cannot `accept` the DHT invite, it is missing some parts'
            )
          )
        }
        if (parts[0] !== 'dht') {
          return cb(
            new Error(
              'Cannot `accept` the DHT invite, it should start with "dht"'
            )
          )
        }
        seed = parts[1]
        if (seed.length === 0) {
          return cb(
            new Error(
              'Cannot `accept` the DHT invite, the seed part is missing'
            )
          )
        }
        remoteId = parts[2]
        if (remoteId.length === 0) {
          return cb(
            new Error(
              'Cannot `accept` the DHT invite, the feed id part is missing'
            )
          )
        }
        //#endregion
        var shsTransform = 'shs:' + remoteId.replace(/^@/, '')
        var addr = invite + '~' + shsTransform
        dhtClient(
          {
            keys: sbot.keys,
            caps: config.caps,
            addr: addr,
            manifest: { dhtInvite: { use: 'async' }, getAddress: 'async' },
          },
          function(err, rpc) {
            //#region preconditions
            if (err) return cb(explain(err, 'Could not connect to DHT server'))
            //#endregion
            var req = { seed: seed, feed: sbot.id }
            rpc.dhtInvite.use(req, function(err2, msg) {
              //#region preconditions
              if (err2) {
                return cb(
                  explain(err2, 'Could not tell friend to use DHT invite')
                )
              }
              //#endregion
              sbot.publish({
                type: 'contact',
                contact: remoteId,
                following: true,
              })
              sbot.gossip.add(addr, 'manual')
              rpc.close()
              cb(null, true)
            })
          }
        )
      },
    }
  },
}
