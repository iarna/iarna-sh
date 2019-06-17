# @iarna/sh

A parser for cross-platform command-lines.

## SYNOPSIS

const { parseString } = require('@iarna/sh')

const ast = parseString('abc;def')

## SUMMARY

A parser for Unix-type command lines. Still a wee bit incomplete, see FUTURE.

The AST returned is relatively simple, made up of:

* type=List, value=[Command(s)...], finish=[bg, pipe, wait, waitAnd, waitOr]
* type=Command, value=[String(s)...], finish=[bg, pipe, wait, waitAnd, waitOr]

For finish-types of `pipe`, `waitAnd`, and `waitOr`, another command is
guranteed to be after it in the list (or the parser will throw an error).

And Strings are:

* type=String, value=[JavaScriptString(s)...]

## TEST COVERAGE

Test coverage is maintained at 100%.

## FUTURE

### For the parser:

* lists `abc && (def || ghi) && jkl`
* in unix style env vars ie `$FOO` and `${FOO}`
* bash-style env-var additions (ie `${FOO:-default}`)
* command substitution (eg `$(Command List)` and backticks)
* redirects (`>/tmp/foo`, `2>/tmp/foo`, `</tmp/foo`)
* duping (`2>&1`)
* redirecting a var into a command `<<< string`

### For all new things:

An evaluator that:

1. Can execute the commands in a compatible cross-platform manner.
2. Provides a VERY SHORT LIST of neccessary built-ins. At the very least `wait`.
3. A cli that takes a command list as a string to execute, for use in npm packages as:
   `ishx "command1 || commmand2"`
4. A template string evaluator ala `@perl/qx` that is cross-platform.
