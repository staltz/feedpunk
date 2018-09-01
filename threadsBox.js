const blessed = require('blessed')
const pull = require('pull-stream')
const { renderTime } = require('./utils')

const label = ' {bold}{green-fg}Threads{/green-fg}{/bold} '

const threadsBox = blessed.list({
  top: 'top',
  left: 29,
  right: 0,
  height: '100%',
  label: label,
  scrollable: true,
  tags: true,
  keys: true,
  vi: true,
  mouse: true,
  border: 'line',
  scrollbar: {
    ch: ' ',
    track: {
      bg: 'black',
    },
    style: {
      inverse: true,
    },
  },
  style: {
    item: {
      hover: {
        bold: true,
      },
    },
    selected: {
      bg: '#004411',
      fg: '#00ff88',
      bold: true,
    },
  },
  search: function(callback) {
    // prompt.input('Search:', '', function(err, value) {
    //   if (err) return
    //   return callback(null, value)
    // })
  },
})

const addNameToMsg = ssb => (msg, cb) => {
  ssb.about.get(msg.author, (err, about) => {
    if (err) return cb(err)
    const authorKey = msg.value.author
    if (!about[authorKey]) return cb(null, msg)
    const nameDefs = about[authorKey].name
    if (!nameDefs) return cb(null, msg)
    const ownName = nameDefs[authorKey]
    if (!ownName) return cb(null, msg)
    ;(msg.value || {}).authorName = ownName[0]
    cb(null, msg)
  })
}

function renderMsg(msg) {
  let msgtype = msg.value.content.type || '?'
  if (msgtype === 'post') {
    msgtype = '{yellow-fg}post{/yellow-fg}'
    const excess = '{yellow-fg}{/yellow-fg}'
    msgtype = (msgtype + '                ').slice(0, 12 + excess.length)
  } else {
    msgtype = (msgtype + '                ').slice(0, 12)
  }
  const authorKeyFull = msg.value.author
  const authorKey = msg.value.author
  let author = msg.value.authorName ? msg.value.authorName + ' ' : authorKey
  author = (author + '                       ').slice(0, 18)
  const timeago = msg.value.timestamp

  return `${msgtype} by ${author} (${timeago})`
}

function renderThread(thread) {
  return `${thread.length} messages, root ${renderMsg(thread[0])}`
}

function renderThreadInBox(thread) {
  const idx = threadsBox.pushItem(renderThread(thread.messages))
  const item = threadsBox.getItem(idx - 1)
  item.ssbThread = thread
  threadsBox.ssbLowest = thread.messages[0].value.timestamp
  threadsBox.screen.render()
}

threadsBox.showExistingFeed = function() {
  this.ssbRecentCount = 0
  this.setLabel(label)
  this.clearItems()

  pull(
    this.ssb.threads.public({
      reverse: true,
      live: false,
      // threadMaxSize: 3,
      allowlist: ['post'],
      limit: this.height - 20,
    }),
    pull.drain(renderThreadInBox),
  )
}

threadsBox.pullOlder = function() {
  pull(
    this.ssb.threads.public({
      reverse: true,
      live: false,
      // threadMaxSize: 3,
      allowlist: ['post'],
      lt: this.ssbLowest,
      limit: 20,
    }),
    pull.drain(renderThreadInBox),
  )
}

threadsBox.alwaysUpdateLabelWithRecents = function() {
  this.ssbRecentCount = 0

  pull(
    this.ssb.threads.public({
      reverse: false,
      gt: Date.now(),
      live: true,
    }),
    pull.drain(() => {
      this.ssbRecentCount += 1
      this.setLabel(label + '(' + this.ssbRecentCount + ' NEW) ')
      this.screen.render()
    }),
  )
}

threadsBox.pullRecentsWhenRequested = function() {
  this.screen.key(['k'], (ch, key) => {
    if (this.getScroll() === 0 && this.ssbRecentCount) this.showExistingFeed()
  })
  this.screen.key(['g'], (ch, key) => {
    if (this.ssbRecentCount) this.showExistingFeed()
  })
}

threadsBox.pullOlderWhenRequested = function() {
  this.screen.key(['j'], (ch, key) => {
    if (this.getScroll() >= this.getScrollHeight() - 1) this.pullOlder()
  })
}

threadsBox.setSSB = function(ssb) {
  this.ssb = ssb
  this.showExistingFeed()
  // this.alwaysUpdateLabelWithRecents()
  this.pullRecentsWhenRequested()
  this.pullOlderWhenRequested()
}

module.exports = threadsBox
