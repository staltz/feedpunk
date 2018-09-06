const blessed = require('blessed')
const pull = require('pull-stream')
const { renderTime } = require('./utils')

const label = ' {bold}{green-fg}Feed{/green-fg}{/bold} '

const feedBox = blessed.list({
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

function renderPost(msg, box) {
  if (msg.value.content && msg.value.content.type !== 'post') return false
  const originalText = msg.value.content.text
  if (!originalText) return false
  const indent = '    '
  const usableWidth = box.width - indent.length - 10
  const lines = Array.from(originalText).reduce(
    (lines, char) => {
      let lastline = lines[lines.length - 1]
      if (lastline.length >= usableWidth) {
        lines.push('')
        lastline = lines[lines.length - 1]
      }
      lastline = lastline + char
      lines[lines.length - 1] = lastline
      return lines
    },
    ['']
  )
  return '\n' + indent + lines.join('\n' + indent)
}

const addNameToMsg = ssb => (msg, cb) => {
  ssb.about.get(msg.author, (err, about) => {
    if (err) return cb(err)
    const authorKey = msg.value.author
    if (!about) return cb(null, msg)
    if (!about[authorKey]) return cb(null, msg)
    const nameDefs = about[authorKey].name
    if (!nameDefs) return cb(null, msg)
    const ownName = nameDefs[authorKey]
    if (!ownName) return cb(null, msg)
    ;(msg.value || {}).authorName = ownName[0]
    cb(null, msg)
  })
}

function renderMsg(msg, box) {
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
  let author = msg.value.authorName ? msg.value.authorName + ' ' : ''
  author = (author + '                       ').slice(0, 18)
  const timeago = renderTime(msg.value)

  return `${msgtype} by ${author} (${timeago})`
}

feedBox.showExistingFeed = function() {
  this.ssbRecentCount = 0
  this.setLabel(label)
  this.clearItems()

  pull(
    this.ssb.createFeedStream({
      reverse: true,
      live: false,
      limit: this.height + 20,
    }),
    pull.filter(msg => msg && msg.value && msg.value.content),
    pull.asyncMap(addNameToMsg(this.ssb)),
    pull.drain(msg => {
      const idx = this.pushItem(renderMsg(msg, this))
      const item = this.getItem(idx - 1)
      item.ssbMsgKey = msg.key
      this.ssbLowest = msg.value.timestamp
      this.screen.render()
    })
  )
}

feedBox.pullOlder = function() {
  pull(
    this.ssb.createFeedStream({
      reverse: true,
      live: false,
      lt: this.ssbLowest,
      limit: 20,
    }),
    pull.filter(msg => msg && msg.value && msg.value.content),
    pull.asyncMap(addNameToMsg(this.ssb)),
    pull.drain(msg => {
      const idx = this.pushItem(renderMsg(msg, this))
      const item = this.getItem(idx - 1)
      item.ssbMsgKey = msg.key
      this.ssbLowest = msg.value.timestamp
      this.screen.render()
    })
  )
}

feedBox.alwaysUpdateLabelWithRecents = function() {
  this.ssbRecentCount = 0

  pull(
    this.ssb.createFeedStream({
      reverse: false,
      gt: Date.now(),
      live: true,
    }),
    pull.filter(msg => msg && msg.value && msg.value.content),
    pull.drain(() => {
      this.ssbRecentCount += 1
      this.setLabel(label + '(' + this.ssbRecentCount + ' NEW) ')
      this.screen.render()
    })
  )
}

feedBox.pullRecentsWhenRequested = function() {
  this.screen.key(['k'], (ch, key) => {
    if (this.getScroll() === 0 && this.ssbRecentCount) this.showExistingFeed()
  })
  this.screen.key(['g'], (ch, key) => {
    if (this.ssbRecentCount) this.showExistingFeed()
  })
}

feedBox.pullOlderWhenRequested = function() {
  this.screen.key(['j'], (ch, key) => {
    if (this.getScroll() >= this.getScrollHeight() - 1) this.pullOlder()
  })
}

feedBox.setSSB = function(ssb) {
  this.ssb = ssb
  this.showExistingFeed()
  this.alwaysUpdateLabelWithRecents()
  this.pullRecentsWhenRequested()
  this.pullOlderWhenRequested()
}

module.exports = feedBox
