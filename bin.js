#!/usr/bin/env node
const blessed = require('blessed')
const startSSB = require('./start-ssb')

const screen = blessed.screen({
  smartCSR: true,
  dockBorders: true,
})
screen.title = 'feedpunk'

const connectionsBox = require('./connectionsBox')
const publishBox = require('./publishBox')
const feedBox = require('./feedBox')
const readMessage = require('./readMessage')

publishBox.on('cancel', () => {
  publishBox.detach()
  screen.publishing = false
  screen.render()
  feedBox.focus()
})

screen.key(['escape', 'q'], (ch, key) => {
  if (screen.publishing) {
    if (key.name === 'q') return
    publishBox.detach()
    screen.publishing = false
    screen.render()
    feedBox.focus()
  } else if (screen.readingMessage) {
    screen.readingMessage.detach()
    screen.readingMessage = void 0
    screen.render()
    feedBox.focus()
  } else {
    process.exit(0)
  }
})

screen.key(['C-c'], (ch, key) => {
  process.exit(0)
})

screen.append(connectionsBox)
screen.append(feedBox)
screen.render()
feedBox.focus()

const ssb = startSSB()
connectionsBox.setSSB(ssb)
feedBox.setSSB(ssb)
publishBox.setSSB(ssb)

screen.key(['space'], (ch, key) => {
  if (screen.readingMessage || screen.publishing) return
  const line = feedBox.getItem(feedBox.getScroll())
  if (line.ssbMsgKey) readMessage(screen, ssb, line.ssbMsgKey)
})

screen.key(['i'], (ch, key) => {
  if (screen.readingMessage || screen.publishing) return
  screen.publishing = true
  screen.append(publishBox)
  screen.render()
  publishBox.focus()
})
