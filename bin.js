#!/usr/bin/env node
const blessed = require('blessed')
const startSSB = require('./start-ssb')

const screen = blessed.screen({
  smartCSR: true,
  dockBorders: true
})
screen.title = 'patchpunk'

const connectionsBox = require('./connectionsBox')
// const feedBox = require('./feedBox')
const threadsBox = require('./threadsBox')
const readMessage = require('./readMessage')
const readThread = require('./readThread')

screen.key(['escape', 'q', 'C-c'], (ch, key) => {
  if (screen.readingMessage) {
    screen.readingMessage.detach()
    screen.readingMessage = void 0
    screen.render()
  } else {
    process.exit(0)
  }
})

screen.append(connectionsBox)
// screen.append(feedBox)
screen.append(threadsBox)
screen.render()
// feedBox.focus()
threadsBox.focus()

const ssb = startSSB()
connectionsBox.setSSB(ssb)
// feedBox.setSSB(ssb)
threadsBox.setSSB(ssb)

// screen.key(['space'], (ch, key) => {
//   const line = feedBox.getItem(feedBox.getScroll())
//   if (line.ssbMsgKey) readMessage(screen, ssb, line.ssbMsgKey)
// })

screen.key(['space'], (ch, key) => {
  const line = threadsBox.getItem(threadsBox.getScroll())
  if (line.ssbThread) readThread(screen, ssb, line.ssbThread)
})
