const fs = require('fs')
const path = require('path')

module.exports = function fixDependencies() {
  const nodemodules = path.join('.', 'node_modules')
  const scuttlebot = path.join(nodemodules, 'scuttlebot')
  const flumeviewhastable = path.join(nodemodules, 'flumeview-hashtable')
  removeConsoleLogs(path.join(scuttlebot, 'plugins', 'gossip', 'schedule.js'))
  removeConsoleLogs(path.join(flumeviewhastable, 'index.js'))
  removeConsoleLogs(path.join(flumeviewhastable, 'multi.js'))
  removeConsoleLogs(path.join(flumeviewhastable, 'hashtable.js'))
}

function removeConsoleLogs(filename) {
  const encoding = 'utf-8'
  try {
    const previousSource = fs.readFileSync(filename, { encoding })
    const nextSource = previousSource.replace(/console\.log.*\n/g, '')
    fs.writeFileSync(filename, nextSource, { encoding })
  } catch (err) {}
}
