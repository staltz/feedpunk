const blessed = require('blessed')
const pull = require('pull-stream')
const { renderTime } = require('./utils')

module.exports = function readThread(screen, ssb, thread) {
  const readThreadBox = blessed.box({
    top: 'center',
    left: 'center',
    width: '50%',
    height: '70%',
    label: ' {bold}{green-fg}Message{/green-fg}{/bold} ',
    tags: true,
    border: {
      type: 'line'
    }
  })

  readThreadBox.setContent(
    thread.messages
      .map(msg => {
        const author = msg.value.author.slice(0, 12)
        const timestamp = msg.value.timestamp
        const content =
          msg.value.content.text || JSON.stringify(msg.value.content)
        return `${author} said at ${timestamp}\n    ${content}`
      })
      .join('\n')
  )

  screen.append(readThreadBox)
  screen.readingMessage = readThreadBox
  screen.render()
}
