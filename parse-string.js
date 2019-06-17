'use strict'
module.exports = parseString
const SHParser = require('./lib/sh-parser.js')
const prettyError = require('./parse-pretty-error.js')

function parseString (str) {
/*
  if (global.Buffer && global.Buffer.isBuffer(str)) {
    str = str.toString('utf8')
  }
*/
  try {
    return new SHParser().parse(str).finish()
  } catch (err) {
    throw prettyError(err, str)
  }
}
