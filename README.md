
# [atom-wannabe][2] package

Atom package for [wannabe.js][1]

**EXPERIMENTAL // WORK IN PROGRESS**

_GIF speed of factor 3._  
![wannabe](https://raw.githubusercontent.com/Skywalker13/atom-wannabe/0.2-stable/wannabe.gif)

## Features

It tries to run the test runner (mocha) on the current javascript file. Only
javascript files that looks like a test are runned by atom-wannabe. This package
is **experimental** and some [drawbacks](#drawbacks) exist.

For example, **babel** is not really supported and if it's the case, then it's
very slow.

Some settings are available with the package but most of time, the default
values are fine.

## Drawbacks

Please, read: https://github.com/Skywalker13/wannabe.js#drawbacks

- Do not write infinite loop, it's not detected. In this case you can kill
  by closing the editor tab.


[1]: https://github.com/Skywalker13/wannabe.js
[2]: https://github.com/Skywalker13/atom-wannabe#atom-wannabe-package
