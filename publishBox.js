var blessed = require('blessed')

var publishBox = blessed.textarea({
  bottom: '0',
  width: '100%',
  height: 10,
  scrollable: false,
  label: ' {bold}{green-fg}Publish{/green-fg}{/bold} ',
  tags: true,
  inputOnFocus: true,
  border: {
    type: 'line',
  },
})

publishBox.setSSB = function setSSB(ssb) {
  const screen = this.screen

  publishBox.key('enter', (ch, key) => {
    if (screen.publishing)
      ssb.publish({ type: 'post', text: publishBox.value }, (err, data) => {
        if (!err) {
          publishBox.clearValue()
          publishBox.cancel()
        }
      })
  })
}

module.exports = publishBox
