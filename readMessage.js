var blessed = require('blessed')
var pull = require('pull-stream')
const { renderTime } = require('./utils')

module.exports = function readMessage(screen, ssb, msgKey) {
  var readMessageBox = blessed.box({
    top: 'center',
    left: 'center',
    width: '90%',
    height: '70%',
    label: ' {bold}{green-fg}Message{/green-fg}{/bold} ',
    tags: true,
    border: {
      type: 'line',
    },
  })

  function setAuthorName(msgValue, about) {
    if (err) return
    const authorKey = msgValue.author
    if (!about[authorKey]) return
    const nameDefs = about[authorKey].name
    if (!nameDefs) return
    const ownName = nameDefs[authorKey]
    if (!ownName) return
    msgValue.authorName = ownName[0]
  }

  function renderMsg(msgValue) {
    readMessageBox.setContent(
      `Author: ${msgValue.authorName || msgValue.author}\n` +
        `When: ${renderTime(msgValue)}\n\n` +
        JSON.stringify(msgValue.content, null, 2)
    )
    screen.render()
  }

  function renderPostMsg(msgValue) {
    readMessageBox.style = { border: { fg: 'yellow' } }
    readMessageBox.setLabel(' {bold}{yellow-fg}Message{/yellow-fg}{/bold} ')
    const msgContent = msgValue.content
    readMessageBox.setContent(
      `Author: ${msgValue.authorName || msgValue.author}\n` +
        `When: ${renderTime(msgValue)}\n` +
        `${msgContent.channel ? `Channel: #${msgContent.channel}\n` : ''}` +
        `${msgContent.root ? `Root: #${msgContent.root}\n` : ''}` +
        `\n${msgContent.text}`
    )
    screen.render()
  }

  ssb.get(msgKey, (err, msgValue) => {
    if (msgValue.content.type === 'post') renderPostMsg(msgValue)
    else renderMsg(msgValue)
  })

  screen.append(readMessageBox)
  screen.readingMessage = readMessageBox
  readMessageBox.focus()
  screen.render()
}
