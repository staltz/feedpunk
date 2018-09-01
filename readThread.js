const blessed = require('blessed')
const pull = require('pull-stream')
const { renderTime } = require('./utils')

module.exports = function readThread(screen, ssb, thread) {
  const readThreadBox = blessed.box({
    top: 'center',
    left: 'center',
    width: '100%',
    height: '100%',
    label: ' {bold}{green-fg}Message{/green-fg}{/bold} ',
    tags: true,
    border: {
      type: 'line',
    },
  })

  readThreadBox.setContent(
    thread.messages
      .map(msg => {
        const author = msg.value.author.slice(0, 12)
        const timestamp = msg.value.timestamp
        const content = (
          msg.value.content.text || JSON.stringify(msg.value.content)
        )
          .replace(/\n/g, '')
          .substr(0, 280)
        return `${author} said at ${timestamp}\n    ${content}\n`
      })
      .join('\n'),
  )

  screen.append(readThreadBox)
  screen.readingMessage = readThreadBox
  screen.render()
}
