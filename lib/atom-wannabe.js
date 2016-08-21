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

function createCheckFrame (editor, frames) {
  const element = createCheck (editor);

  if (frames.some ((frame) => !!frame.exception)) {
    element.style.backgroundColor = '#ff8200';
  } else {
    element.style.backgroundColor = '#108206';
  }

  return element;
}

function createLocal (frame) {
  const element = document.createElement ('div');
  element.className = 'atom-wannabe-marker-frame-div';

  const child = document.createElement ('div');
  child.className = 'atom-wannabe-marker-frame-open';
  element.appendChild (child);

  frame.locals.forEach ((local) => {
    if (local.value !== undefined) {
      element.textContent += ` ${local.name}=${local.value}`;
    }
  });

  return element;
}

function createArgument (frame) {
  const element = document.createElement ('div');
  element.className = 'atom-wannabe-marker-frame-div';

  element.textContent = 'args';
  frame.arguments.forEach ((argument) => {
    element.textContent += ` ${argument.name}=${argument.value}`;
  });

  return element;
}

function createReturn (frame) {
  const element = document.createElement ('div');
  element.className = 'atom-wannabe-marker-frame-div';
  element.textContent = `ret:${frame.returnValue.value}`;
  return element;
}

function createException (frame) {
  const element = document.createElement ('div');
  element.className = 'atom-wannabe-marker-frame-div';
  element.textContent = `ex:${frame.exception.type}=${frame.exception.text}`;
  return element;
}

function createConsole (frame) {
  const element = document.createElement ('div');
  element.className = 'atom-wannabe-marker-frame-div';
  element.textContent = `${frame.console.type}:${frame.console.text}`;
  return element;
}

function createDump (editor, frames) {
  let divs = [];

  frames.forEach ((frame) => {
    if (frame.locals && frame.locals.length > 0) {
      divs.push (createLocal (frame));
    }

    if (frame.arguments && frame.arguments > 0) {
      divs.push (createArgument (frame));
    }

    if (frame.returnValue) {
      divs.push (createReturn (frame));
    }

    if (frame.exception) {
      divs.push (createException (frame));
    }

    if (frame.console) {
      divs.push (createConsole (frame));
    }
  });

  const element = document.createElement ('div');
  divs.forEach ((div) => element.appendChild (div));

  element.style.marginLeft    = '30px';
  element.style.marginTop     = `-${editor.getLineHeightInPixels ()}px`;
  element.style.display       = 'flex';
  element.style.flexDirection = 'row';

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
    this._test = test;
    this._mark = createMarker (editor, parseInt (test.line) - 1, 999);

    this._decorMark = editor.decorateMarker (this._mark, {
      type:  'overlay',
      item:   createBadge (editor, test),
      class: 'atom-wannabe-marker-test'
    });

    this._decorGutter = editor.gutterWithName ('markerTest').decorateMarker (this._mark, {
      type:  'gutter',
      item:  createCheckTest (editor, test),
      class: 'atom-wannabe-marker-gutter'
    });
  }

  dispose () {
    this._mark.destroy ();
  }

  append (test) {

  }

  unconfirm (editor) {
    let props;

    props = this._decorMark.getProperties ();
    props.class = 'atom-wannabe-marker-test-unconfirm';
    this._decorMark.destroy ();
    this._decorMark = editor.decorateMarker (this._mark, props);

    props = this._decorGutter.getProperties ();
    props.class = `atom-wannabe-marker-gutter-unconfirm`;
    this._decorGutter.destroy ();
    this._decorGutter = editor.gutterWithName ('markerTest').decorateMarker (this._mark, props);
  }

  get data () {
    return this._test;
  }
}

class FrameMark {
  constructor (editor, frame) {
    this._frames = [frame];
    this._editor = editor;
    this._create ();
  }

  dispose () {
    this._mark.destroy ();
  }

  _create () {
    const {line} = this._frames[0];
    this._mark = createMarker (this._editor, parseInt (line) - 1, 999);

    this._decorMark = this._editor.decorateMarker (this._mark, {
      type:  'overlay',
      item:   createDump (this._editor, this._frames),
      class: 'atom-wannabe-marker-frame'
    });

    this._decorGutter = this._editor.gutterWithName ('markerTest').decorateMarker (this._mark, {
      type:  'gutter',
      item:  createCheckFrame (this._editor, this._frames),
      class: 'atom-wannabe-marker-gutter'
    });
  }

  append (frame) {
    this._frames.push (frame);
    this._mark.destroy ();
    this._create ();
  }

  unconfirm (editor) {
    let props;

    props = this._decorMark.getProperties ();
    props.class = `atom-wannabe-marker-frame-unconfirm`;
    this._decorMark.destroy ();
    this._decorMark = editor.decorateMarker (this._mark, props);

    props = this._decorGutter.getProperties ();
    props.class = `atom-wannabe-marker-gutter-unconfirm`;
    this._decorGutter.destroy ();
    this._decorGutter = editor.gutterWithName ('markerTest').decorateMarker (this._mark, props);
  }

  get data () {
    return this._frames;
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

  createFrameMark (frame) {
    if (this._invalidMarks.frame[frame.line]) {
      this._invalidMarks.frame[frame.line].dispose ();
      delete this._invalidMarks.frame[frame.line];
    }
    if (this._validMarks.frame[frame.line]) {
      this._validMarks.frame[frame.line].append (frame);
    } else {
      const mark = new FrameMark (this._editor, frame);
      this._validMarks.frame[frame.line] = mark;
    }
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

    const {frames, tests} = yield wannabe.run ();
    if (frames && Object.keys (frames).length) {
      return tests;
    }
    return null;
  }),

  _runWannabe: watt (function * (editor, markRegistry) {
    const filePath = editor.getPath ();
    const fileText = editor.getText ();
    const line = editor.getCursorBufferPosition ().row;

    try {
      markRegistry.invalidMarks ();
      const tests = yield this._runWannabe2 (editor, markRegistry, filePath, fileText, line);
      if (!tests) {
        yield this._runWannabe2 (editor, markRegistry, filePath, fileText, /.*/);
      } else {
        markRegistry.checkInvalids (tests);
      }
    } catch (ex) {
      markRegistry.checkInvalids ();
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
