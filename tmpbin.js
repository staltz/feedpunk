#!/usr/bin/env node
const startSSB = require('./start-ssb')
const pull = require('pull-stream')

const ssb = startSSB()

function renderThreadInBox(thread) {
  console.log('THREAD: ' + JSON.stringify(thread, null, 2) + '\n')
}

pull(
  ssb.threads.public({
    reverse: true,
    live: false,
    limit: 40
  }),
  pull.drain(renderThreadInBox)
)
