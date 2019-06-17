'use strict'
const ParserEND = 0x110000
class ParserError extends Error {
  /* istanbul ignore next */
  constructor (msg, filename, linenumber) {
    super('[ParserError] ' + msg, filename, linenumber)
    this.name = 'ParserError'
    this.code = 'ParserError'
    if (Error.captureStackTrace) Error.captureStackTrace(this, ParserError)
  }
}
class State {
  constructor (parser) {
    this.parser = parser
    this.buf = ''
    this.returned = null
    this.result = null
  }
}
class Parser {
  constructor () {
    this.pos = 0
    this.col = 0
    this.line = 0
    this.obj = {}
    this.ctx = this.obj
    this.stack = []
    this.ctxStack = []
    this._buf = ''
    this.char = null
    this.ii = 0
    this.state = new State(this.parseStart)
  }
  buf () {
    const result = this.state.buf
    this.state.buf = ''
    return result
  }

  parse (str) {
    /* istanbul ignore next */
    if (str.length === 0 || str.length == null) return

    this._buf = String(str)
    this.ii = -1
    this.char = -1
    let getNext
    while (getNext === false || this.nextChar()) {
      getNext = this.runOne()
    }
    this._buf = null
    return this
  }
  nextChar () {
    if (this.char === 0x0A) {
      ++this.line
      this.col = -1
    }
    ++this.ii
    this.char = this._buf.codePointAt(this.ii)
    ++this.pos
    ++this.col
    return this.haveBuffer()
  }
  haveBuffer () {
    return this.ii < this._buf.length
  }
  runOne () {
    return this.state.parser.call(this, this.state.returned)
  }
  finish () {
    this.char = ParserEND
    let last
    do {
      last = this.state.parser
      this.runOne()
    } while (this.state.parser !== last)

    this.ctx = null
    this.state = null
    this._buf = null

    return this.obj
  }
  next (fn) {
    /* istanbul ignore next */
    if (typeof fn !== 'function') throw new ParserError('Tried to set state to non-existent state: ' + JSON.stringify(fn))
    this.state.parser = fn
  }
  goto (fn) {
    this.next(fn)
    return this.runOne()
  }
  call (fn, returnWith) {
    /* istanbul ignore else */
    if (returnWith) this.next(returnWith)
    this.stack.push(this.state)
    this.ctxStack.push(this.ctx)
    this.ctx = null
    this.state = new State(fn)
  }
  callNow (fn, returnWith) {
    this.call.apply(this, arguments)
    return this.runOne()
  }
  return (value) {
    /* istanbul ignore if */
    if (this.stack.length === 0) throw this.error(new ParserError('Stack underflow'))
    /* istanbul ignore else */
    if (value == null) value = this.ctx
//    if (value == null) value = this.state.buf
    this.state = this.stack.pop()
    this.ctx = this.ctxStack.pop()
    this.state.returned = value
  }
  returnNow (value) {
    this.return(value)
    return this.runOne()
  }
  consume (char) {
    if (arguments.length === 1) {
      this.state.buf += char
    } else {
      /* istanbul ignore if */
      if (this.char === ParserEND) throw this.error(new ParserError('Unexpected end-of-buffer'))
      this.state.buf += this._buf[this.ii]
    }
  }
  error (err) {
    err.line = this.line
    err.col = this.col
    err.pos = this.pos
    return err
  }
  /* istanbul ignore next */
  parseStart () {
    throw new ParserError('Must declare a parseStart method')
  }
}
Parser.END = ParserEND
Parser.Error = ParserError
module.exports = Parser
module.exports.State = State
