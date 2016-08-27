'use strict';

const FrameMark = require ('./frame-mark.js');
const TestMark  = require ('./test-mark.js');


class MarkRegistry {
  constructor (editor) {
    this._editor = editor;
    this._validMarks = {
      test: {},
      frame: {}
    };
    this._invalidMarks = {
      test: {},
      frame: {}
    };
  }

  dispose () {
    Object
      .keys (this._validMarks.frame)
      .forEach ((line) => this._validMarks.frame[line].dispose ());
    Object
      .keys (this._validMarks.test)
      .forEach ((line) => this._validMarks.test[line].dispose ());
    this._validMarks.test = {};
    this._validMarks.frame = {};

    this.invalidDispose ();
  }

  invalidMarks () {
    this._invalidMarks.test = this._validMarks.test;
    this._invalidMarks.frame = this._validMarks.frame;
    this._validMarks.test = {};
    this._validMarks.frame = {};
  }

  invalidDispose () {
    Object
      .keys (this._invalidMarks.frame)
      .forEach ((line) => this._invalidMarks.frame[line].dispose ());
    Object
      .keys (this._invalidMarks.test)
      .forEach ((line) => this._invalidMarks.test[line].dispose ());
    this._invalidMarks.test = {};
    this._invalidMarks.frame = {};
  }

  checkInvalids (tests) {
    const testLines = tests ? tests.map ((test) => test.line) : null;

    Object
      .keys (this._invalidMarks.frame)
      .filter ((line) => !testLines || testLines.indexOf (this._invalidMarks.frame[line].data[0].test.line) === -1)
      .forEach ((line) => {
        this._validMarks.frame[line] = this._invalidMarks.frame[line];
        this._validMarks.frame[line].unconfirm (this._editor);
        delete this._invalidMarks.frame[line];
      });

    Object
      .keys (this._invalidMarks.test)
      .filter ((line) => !testLines || testLines.indexOf (line) === -1)
      .forEach ((line) => {
        this._validMarks.test[line] = this._invalidMarks.test[line];
        this._validMarks.test[line].unconfirm (this._editor);
        delete this._invalidMarks.test[line];
      });
  }

  checkIfExists (frame) {
    return Object
      .keys (this._validMarks.frame)
      .some ((line) => this._validMarks.frame[line].checkIfExists (frame));
  }

  createTestMark (test) {
    if (this._invalidMarks.test[test.line]) {
      this._invalidMarks.test[test.line].dispose ();
      delete this._invalidMarks.test[test.line];
    }
    if (this._validMarks.test[test.line]) {
      this._validMarks.test[test.line].append (test);
    } else {
      const mark = new TestMark (this._editor, test);
      this._validMarks.test[test.line] = mark;
    }
  }

  createFrameMark (frame, onlyGutter) {
    if (this._invalidMarks.frame[frame.line]) {
      this._invalidMarks.frame[frame.line].dispose ();
      delete this._invalidMarks.frame[frame.line];
    }
    if (this._validMarks.frame[frame.line]) {
      this._validMarks.frame[frame.line].append (frame, onlyGutter);
    } else {
      const mark = new FrameMark (this._editor, frame, onlyGutter);
      this._validMarks.frame[frame.line] = mark;
    }
  }
}

module.exports = MarkRegistry;
