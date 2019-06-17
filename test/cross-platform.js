'use strict'
const { test } = require('tap')
const { parseString } = require('../index.js')

const finishMap = {
  'wait': ';',
  'waitAnd': '&&',
  'waitOr': '||',
  'pipe': '|',
  'bg': '&'
}
function redir (ast) {
  let str = ''
  for (let fn of Object.keys(ast.fh)) {
    if (str !== '') str += ' '
    str += String(fn)
    str += ast.fh[fn] === 0 ? '<' : '>'
    if (typeof ast.fh[fn] === 'number') {
      str += '&'
    }
    str += ast.fh[fn]
  }
  return str
}
function toString (ast) {
  if (ast.type === 'List') {
    return '(' + ast.value.map(toString).join('').trim() + ')' + finishMap[ast.finish]
  } else if (ast.type === 'Command') {
    return ast.value.map(toString).join(' ') + redir(ast) + finishMap[ast.finish]
  } else if (ast.type === 'String') {
    let str = ast.value.join('')
    if (/[']/.test(str)) {
      return `"${str.replace(/"/g, '\\"')}"`
    } else if (/[;&|" ]/.test(str)) {
      return `'${str}'`
    } else {
      return str
    }
  }
}

test('cross-platform', async t => {
  t.is(toString(parseString('A')), '(A;);', 'simple')
  t.is(toString(parseString('A&')), '(A&);', 'bg')
  t.is(toString(parseString('    A   ')), '(A;);', 'whitespace')
  t.is(toString(parseString('A&&B')), '(A&&B;);', 'and')
  t.is(toString(parseString('A|B')), '(A|B;);', 'pipe')
  t.is(toString(parseString('A&B&')), '(A&B&);', 'bgs')
  t.is(toString(parseString('A B C')), '(A B C;);', 'args')
  t.is(toString(parseString("'A B' C")), "('A B' C;);", 'squotes')
  t.is(toString(parseString('"ab\\"de\\f"')), "('ab\"de\\f';);", 'dquote escape')
  t.is(toString(parseString('\\"ab')), "('\"ab';);", 'plain escape')
  t.is(toString(parseString('partial"double"')), '(partialdouble;);', 'double part way through')
  t.is(toString(parseString("partial'single'")), '(partialsingle;);', 'single part way through')
  t.throws(() => parseString('abc&&'), 'and nothing')
  t.throws(() => parseString('abc|'), 'pipe nothing')
  t.throws(() => parseString('abc;;'), 'no double semi')
  t.throws(() => parseString('abc&&&&'), 'no double and')
  t.throws(() => parseString('abc&&;'), 'no and end')
  t.throws(() => parseString('abc|;'), 'no pipe end')
})

test('unix-only', async t => {
  t.is(toString(parseString('A;B')), '(A;B;);', 'pair')
  t.is(toString(parseString('A;B;C')), '(A;B;C;);', 'triple')
  t.is(toString(parseString('A\n\n\nB;C')), '(A;B;C;);', 'newlines')
  t.is(toString(parseString('"A;B";C')), "('A;B';C;);", 'dquotes')
  t.is(toString(parseString('A||B')), '(A||B;);', 'or')
  t.is(toString(parseString('A|&B')), '(A2>&1|B;);', '|&')
  t.throws(() => parseString('abc||'), 'or nothing')
  t.throws(() => parseString('abc||||'), 'no double or')
  t.throws(() => parseString('abc||;'), 'no or end')
})
