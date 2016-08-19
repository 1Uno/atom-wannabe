'use babel';
'use strict';

const watt                  = require ('watt');
const {CompositeDisposable} = require ('atom');
const Wannabe               = require ('wannabe');


function createCheck () {
  const element = document.createElement ('div');

  element.style.position     = 'relative';
  element.style.top          = '0.2em';
  element.style.width        = `1em`;
  element.style.maxHeight    = `1em`;
  element.style.minHeight    = `1em`;
  element.style.borderRadius = '2px';
  element.style.boxSizing    = 'border-box';

  return element;
}

function createCheckFrame (editor, frame) {
  const element = createCheck (editor);

  if (frame.exception) {
    element.style.backgroundColor = '#ff8200';
  } else {
    element.style.backgroundColor = '#108206';
  }

  return element;
}

function createDump (editor, frame) {
  let text = '';

  if (frame.locals) {
    frame.locals.forEach ((local) => {
      if (local.value !== undefined) {
        text += ` ${local.name}=${local.value}`;
      }
    });
  }

  if (frame.arguments) {
    frame.arguments.forEach ((argument) => {
      text += ` ${argument.name}=${argument.value}`;
    });
  }

  if (frame.returnValue) {
    text += ` return:${frame.returnValue.value}`;
  }

  if (frame.exception) {
    text += ` ${frame.exception.type}=${frame.exception.text}`;
  }

  if (frame.console) {
    text += ` ${frame.console.type}=${frame.console.text}`;
  }

  const element = document.createElement ('div');
  element.textContent = text;

  element.style.backgroundColor = '#AAA';
  element.style.color           = 'black';
  element.style.borderRadius    = '5px';
  element.style.paddingRight    = '5px';
  element.style.paddingLeft     = '5px';
  element.style.marginLeft      = '30px';
  element.style.marginTop       = `-${editor.getLineHeightInPixels ()}px`;

  return element;
}

function createCheckTest (editor, test) {
  const element = createCheck (editor);

  switch (test.state) {
    case 'passed': {
      element.style.backgroundColor = '#12b804';
      break;
    }
    case 'failed': {
      element.style.backgroundColor = '#d50000';
      break;
    }
    default: {
      element.style.backgroundColor = '#5c5c5c';
      break;
    }
  }

  return element;
}

function createMarker (editor, line, column) {
  return editor.markBufferPosition ([line, column], {invalidate: 'surround'});
}

function createBadge (editor, test) {
  const element = document.createElement ('div');
  element.textContent = `${test.state || 'unknown'}`;
  if (test.duration) {
    element.textContent += ` (${test.duration}ms)`;
  }
  if (test.err && test.err.message) {
    element.textContent += ` @ ${test.err.message}`;
  }

  switch (test.state) {
    case 'passed': {
      element.style.borderBottom    = '#1e9400';
      element.style.backgroundColor = 'rgba(30, 148, 0, 0.2)';
      break;
    }
    case 'failed': {
      element.style.borderBottom    = '#af0000';
      element.style.backgroundColor = 'rgba(175, 0, 0, 0.2)';
      break;
    }
    default: {
      element.style.borderBottom    = '#5c5c5c';
      element.style.backgroundColor = 'rgba(92, 92, 92, 0.2)';
      break;
    }
  }

  element.style.borderBottomStyle = 'double';
  element.style.fontSize          = '90%';
  element.style.height            = '1.5em';
  element.style.marginLeft        = '10px';
  element.style.marginTop         = `-${editor.getLineHeightInPixels ()}px`;

  return element;
}

class TestMark {
  constructor (editor, test) {
    this._mark = createMarker (editor, parseInt (test.line) - 1, 999);

    editor.decorateMarker (this._mark, {
      type:  'overlay',
      item:   createBadge (editor, test),
      class: 'atom-wannabe-marker-test'
    });

    editor.gutterWithName ('markerTest').decorateMarker (this._mark, {
      type:  'gutter',
      item:  createCheckTest (editor, test),
      class: 'atom-wannabe-marker-gutter'
    });
  }

  dispose () {
    this._mark.destroy ();
  }
}

class FrameMark {
  constructor (editor, frame) {
    const {line}     = frame;
    this._mark       = createMarker (editor, parseInt (line) - 1, 999);
    this._markGutter = createMarker (editor, parseInt (line) - 1, 0);

    editor.decorateMarker (this._mark, {
      type:  'overlay',
      item:   createDump (editor, frame),
      class: 'atom-wannabe-marker-frame'
    });

    editor.gutterWithName ('markerTest').decorateMarker (this._markGutter, {
      type:  'gutter',
      item:  createCheckFrame (editor, frame),
      class: 'atom-wannabe-marker-gutter'
    });
  }

  dispose () {
    this._mark.destroy ();
    this._markGutter.destroy ();
  }
}

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
    Object.keys (this._validMarks.frame).forEach ((line) => this._validMarks.frame[line].dispose ());
    Object.keys (this._validMarks.test).forEach ((line) => this._validMarks.test[line].dispose ());
    this._validMarks.test = {};
    this._validMarks.frame = {};
    Object.keys (this._invalidMarks.frame).forEach ((line) => this._invalidMarks.frame[line].dispose ());
    Object.keys (this._invalidMarks.test).forEach ((line) => this._invalidMarks.test[line].dispose ());
    this._invalidMarks.test = {};
    this._invalidMarks.frame = {};
  }

  invalidMarks () {
    this._invalidMarks.test = this._validMarks.test;
    this._invalidMarks.frame = this._validMarks.frame;
    this._validMarks.test = {};
    this._validMarks.frame = {};
  }

  invalidDispose () {
    Object.keys (this._invalidMarks.frame).forEach ((line) => this._invalidMarks.frame[line].dispose ());
    Object.keys (this._invalidMarks.test).forEach ((line) => this._invalidMarks.test[line].dispose ());
    this._invalidMarks.test = {};
    this._invalidMarks.frame = {};
  }

  createTestMark (test) {
    const mark = new TestMark (this._editor, test);
    if (this._invalidMarks.test[test.line]) {
      this._invalidMarks.test[test.line].dispose ();
      delete this._invalidMarks.test[test.line];
    }
    this._validMarks.test[test.line] = mark;
    return mark;
  }

  createFrameMark (frame) {
    const mark = new FrameMark (this._editor, frame);
    if (this._invalidMarks.frame[frame.line]) {
      this._invalidMarks.frame[frame.line].dispose ();
      delete this._invalidMarks.frame[frame.line];
    }
    this._validMarks.frame[frame.line] = mark;
    return mark;
  }
}

export default {
  subscriptions: null,

  _runWannabe2: watt (function * (editor, markRegistry, filePath, fileText, extractFrom) {
    const wannabe = new Wannabe (filePath, fileText, 'it', extractFrom);
    const runner = yield wannabe.runner ();

    runner.on ('frame', (frame) => {
      markRegistry.createFrameMark (frame);
    });

    runner.on ('test', (test) => {
      markRegistry.createTestMark (test);
    });

    const {frames} = yield wannabe.run ();
    if (frames && Object.keys (frames).length) {
      return true;
    }
    return false;
  }),

  _runWannabe: watt (function * (editor, markRegistry) {
    const filePath = editor.getPath ();
    const fileText = editor.getText ();
    const line = editor.getCursorBufferPosition ().row;

    try {
      markRegistry.invalidMarks ();
      const done = yield this._runWannabe2 (editor, markRegistry, filePath, fileText, line);
      if (!done) {
        yield this._runWannabe2 (editor, markRegistry, filePath, fileText, /.*/);
      }
    } catch (ex) {
      throw ex;
    } finally {
      markRegistry.invalidDispose ();
    }
  }),

  activate () {
    const self = this;
    this.subscriptions = new CompositeDisposable ();

    atom.workspace.observeTextEditors ((editor) => {
      editor.addGutter ({name: 'markerTest'});
      const markRegistry = new MarkRegistry (editor);

      let edited = 0;

      editor.onDidStopChanging (watt (function * () {
        ++edited;
        if (edited > 1) {
          return;
        }

        while (edited > 0) {
          try {
            yield self._runWannabe (editor, markRegistry);
          } catch (ex) {
            console.error (ex.stack || ex);
          } finally {
            --edited;
            if (edited > 1) {
              edited = 1;
            }
          }
        }
      }));
    });
  },

  deactivate () {
    this.subscriptions.dispose ();
  },

  serialize () {}
};
