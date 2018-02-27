var blessed = require('blessed')
var pull = require('pull-stream')

var connectionsBox = blessed.list({
  top: 'top',
  left: 'left',
  width: 29,
  height: '100%',
  scrollable: false,
  label: ' {bold}{green-fg}Connections{/green-fg}{/bold} ',
  tags: true,
  border: {
    type: 'line'
  }
})

connectionsBox.setSSB = function setSSB(ssb) {
  const screen = this.screen
  const connectedPeers = new Map()

  function rerender() {
    if (connectedPeers.size === 0) return
    connectionsBox.clearItems()
    connectedPeers.forEach(peer =>
      connectionsBox.addItem(peer.host || peer.key)
    )
    screen.render()
  }

  ssb.gossip.peers((err, peers) => {
    if (err) return console.error(err)
    peers.filter(x => x.state === 'connected').forEach(peer => {
      connectedPeers.set(peer.key, peer)
    })
    rerender()
  })

  pull(
    ssb.gossip.changes(),
    pull.drain(data => {
      if (data.peer) {
        if (data.type === 'remove' || data.type === 'disconnect') {
          connectedPeers.delete(data.peer.key)
        } else {
          if (data.peer.state === 'connected') {
            connectedPeers.set(data.peer.key, data.peer)
          } else {
            connectedPeers.delete(data.peer.key)
          }
          rerender()
        }
      }
    })
  )
}

module.exports = connectionsBox
