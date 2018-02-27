const humantime = require('human-time')

module.exports.renderTime = msgValue => {
  if (!msgValue.timestamp) return '?'
  return humantime(new Date(msgValue.timestamp))
}
