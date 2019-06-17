'use strict'
'use strict'
/* eslint-disable no-new-wrappers, no-eval, camelcase, operator-linebreak */
module.exports = makeParserClass(require('./parser.js'))
module.exports.makeParserClass = makeParserClass

class ParseError extends SyntaxError {
  constructor (msg) {
    super(msg)
    this.name = 'ParseError'
    /* istanbul ignore else */
    if (Error.captureStackTrace) Error.captureStackTrace(this, ParseError)
    this.fromTOML = true
    this.wrapped = null
  }
}
/*
ParseError.wrap = err => {
  const terr = new ParseError(err.message)
  terr.code = err.code
  terr.wrapped = err
  return terr
}
*/
module.exports.ParseError = ParseError

const CHAR_LF = 0x0A
const CHAR_CR = 0x0D
const CHAR_SP = 0x20
const CHAR_QUOT = 0x22
const CHAR_AMP = 0x26
const CHAR_APOS = 0x27
const CHAR_RP = 0x29
const CHAR_SEMI = 0x3B
const CHAR_BSOL = 0x5C
const CHAR_PIPE = 0x7C

class Exec {
  constructor () {
    this.value = []
    this.fh = {}
    this.finish = 'wait'
  }
}
class CmdList extends Exec {
  constructor () {
    super()
    this.type = 'List'
  }
}
class Command extends Exec {
  constructor () {
    super()
    this.type = 'Command'
  }
}

class IString {
  constructor () {
    this.type = 'String'
    this.value = []
  }
}

function makeParserClass (Parser) {
  class Grammar extends Parser {
    /* MATCH HELPER */
    atEndOfLine () {
      return this.char === Parser.END || this.char === CHAR_LF || this.char === CHAR_CR
    }
    atEndOfCommand () {
      return this.atEndOfLine() || this.char === CHAR_AMP || this.char === CHAR_SEMI || this.char === CHAR_PIPE || this.char === CHAR_RP
    }
//    isDigit (cp) {
//      return cp >= CHAR_0 && cp <= CHAR_9
//    }

    parseStart () {
      return this.callNow(this.parseListStart, this.parseEnd)
    }
    parseEnd (list) {
      this.obj = list
      // istanbul ignore else
      if (this.char === Parser.END) {
        return null
      } else {
        // if this happens we've hit some sort of unexpected parser error =/
        throw this.error(new Parser.Error(`unexpected character after end`))
      }
    }
    parseListStart () {
      this.ctx = new CmdList()
      return this.goto(this.parseList)
    }
    parseList () {
      if (this.char === CHAR_CR || this.char === CHAR_LF) {
        return null
      }
      return this.callNow(this.parseCommandStart, this.parseListNext)
    }
    parseListNext (cmd) {
      if (cmd.value.length === 0) throw this.error(new ParseError(`Unexpected empty command`))
      if (this.char === CHAR_AMP) {
        return this.next(this.parseListNext_bgOrAnd)
      } else if (this.char === CHAR_PIPE) {
        return this.next(this.parseListNext_pipeOrOr)
      }
      this.ctx.value.push(cmd)
      if (this.char === Parser.END) {
        return this.returnNow()
      } else {
        return this.next(this.parseListMaybe)
      }
    }
    parseListMaybe () {
      if (this.char === Parser.END) {
        return this.returnNow()
//      } else if (this.char === CHAR_RP) {
//        return this.return()
      } else {
        return this.goto(this.parseList)
      }
    }
    parseListMore () {
      if (this.char === Parser.END || this.char === CHAR_RP) {
        throw this.error(new ParseError('incomplete expression'))
      } else {
        return this.goto(this.parseList)
      }
    }
    parseListNext_pipeOrOr (cmd) {
      if (this.char === CHAR_PIPE) {
        cmd.finish = 'waitOr'
        this.ctx.value.push(cmd)
        return this.next(this.parseListMore)
      } else {
        cmd.finish = 'pipe'
        this.ctx.value.push(cmd)
        return this.goto(this.parseListMore)
      }
    }
    parseListNext_bgOrAnd (cmd) {
      if (this.char === CHAR_AMP) {
        cmd.finish = 'waitAnd'
        this.ctx.value.push(cmd)
        return this.next(this.parseListMore)
      } else {
        cmd.finish = 'bg'
        this.ctx.value.push(cmd)
        return this.goto(this.parseListMaybe)
      }
    }
    parseCommandStart () {
      this.ctx = new Command()
      return this.goto(this.parseCommand)
    }
    parseCommand () {
      if (this.char === CHAR_SP) {
        return null
      } else if (this.atEndOfCommand()) {
        return this.returnNow()
      } else {
        return this.callNow(this.parseStringStart, this.parseCommandNext)
      }
    }
    parseCommandNext (arg) {
      this.ctx.value.push(arg)
      return this.goto(this.parseCommand)
    }
    parseStringStart () {
      this.ctx = new IString()
      return this.goto(this.parseString)
    }
    parseString () {
      if (this.atEndOfCommand() || this.char === CHAR_SP) {
        const buf = this.buf()
        if (buf !== '') this.ctx.value.push(buf)
        return this.returnNow()
      } else if (this.char === CHAR_QUOT) {
        const buf = this.buf()
        if (buf !== '') this.ctx.value.push(buf)
        return this.next(this.parseDoubleString)
      } else if (this.char === CHAR_APOS) {
        const buf = this.buf()
        if (buf !== '') this.ctx.value.push(buf)
        return this.next(this.parseSingleString)
      } else if (this.char === CHAR_BSOL) {
        return this.next(this.parseStringEscape)
      } else {
        this.consume()
      }
    }
    parseStringEscape () {
      this.consume()
      return this.next(this.parseString)
    }
    parseDoubleString () {
      if (this.char === CHAR_BSOL) {
        return this.next(this.parseDoubleStringEscape)
      } else if (this.char === CHAR_QUOT) {
        this.ctx.value.push(this.buf())
        return this.next(this.parseString)
      } else {
        this.consume()
      }
    }
    parseDoubleStringEscape () {
      if (this.char !== CHAR_QUOT) {
        this.consume('\\')
      }
      this.consume()
      return this.next(this.parseDoubleString)
    }
    parseSingleString () {
      if (this.char === CHAR_APOS) {
        this.ctx.value.push(this.buf())
        return this.next(this.parseString)
      } else {
        this.consume()
      }
    }
  }
  return Grammar
}
