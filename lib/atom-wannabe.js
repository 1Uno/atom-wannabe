'use babel';
'use strict';

const watt = require ('watt');
const path = require ('path');
const {CompositeDisposable} = require ('atom');
const Wannabe = require ('wannabe');
const MarkRegistry = require ('./mark-registry.js');

class AtomWannabe {
  constructor (editor) {
    this._wannabe = null;
    this._running = false;
    this._editor = editor;
    this._markRegistry = new MarkRegistry (this, this._editor);

    this._editor.addGutter ({name: 'markerTest'});
    watt.wrapAll (this);
  }

  *_run (filePath, fileText, extractFrom) {
    this._wannabe = new Wannabe (
      filePath,
      fileText,
      new RegExp (atom.config.get ('atom-wannabe.funcNames')),
      extractFrom
    );
    const runner = yield this._wannabe.runner ();

    runner.on ('frame', frame => {
      const onlyGutter = this._markRegistry.checkIfExists (frame);
      this._markRegistry.createFrameMark (frame, onlyGutter);
    });

    runner.on ('test', test => {
      if (!this._editor.getVisibleRowRange ()) {
        return;
      }
      this._markRegistry.createTestMark (test);
    });

    const {frames, tests} = yield this._wannabe.run ();
    this._wannabe.dispose ();
    this._wannabe = null;
    if (frames && Object.keys (frames).length) {
      return tests;
    }
    return null;
  }

  *run () {
    if (this._running) {
      return;
    }

    this._running = true;
    const filePath = this._editor.getPath ();
    if (
      !new RegExp (atom.config.get ('atom-wannabe.testFiles')).test (filePath)
    ) {
      return;
    }

    if (
      !new RegExp (atom.config.get ('atom-wannabe.testDirectory')).test (
        path.basename (path.dirname (filePath))
      )
    ) {
      return;
    }

    const fileText = this._editor.getText ();
    const line = this._editor.getCursorBufferPosition ().row;

    try {
      this._markRegistry.invalidMarks ();
      const tests = yield this._run (filePath, fileText, line);
      if (!tests) {
        yield this._run (filePath, fileText, /.*/);
      } else {
        this._markRegistry.checkInvalids (tests);
      }
    } catch (ex) {
      this._markRegistry.checkInvalids ();
      throw ex;
    } finally {
      this._markRegistry.invalidDispose ();
      this._running = false;
    }
  }

  *runAll () {
    if (this._running) {
      return;
    }

    this._running = true;
    try {
      this._markRegistry.invalidMarks ();
      yield this._run (this._editor.getPath (), this._editor.getText (), /.*/);
    } finally {
      this._markRegistry.invalidDispose ();
      this._running = false;
    }
  }

  dispose () {
    if (this._wannabe) {
      this._wannabe.dispose ();
    }
    this._markRegistry.dispose ();
  }
}

export default {
  subscriptions: null,

  activate () {
    this.subscriptions = new CompositeDisposable ();

    atom.workspace.observeTextEditors (editor => {
      const wannabeRunner = new AtomWannabe (editor);

      let edited = 0;

      this.subscriptions.add (
        editor.onDidStopChanging (
          watt (function* () {
            ++edited;
            if (edited > 1) {
              return;
            }

            while (edited > 0) {
              try {
                yield wannabeRunner.run ();
              } catch (ex) {
                console.error (ex.stack || ex);
              } finally {
                --edited;
                if (edited > 1) {
                  edited = 1;
                }
              }
            }
          })
        )
      );

      this.subscriptions.add (
        editor.onDidDestroy (() => {
          wannabeRunner.dispose ();
        })
      );
    });
  },

  deactivate () {
    this.subscriptions.dispose ();
  },

  serialize () {},

  config: {
    funcNames: {
      title: 'Function names recognized by mocha',
      description: 'It must be a regular expression',
      type: 'string',
      default: '^(it|specify|test)$',
    },
    testFiles: {
      title: 'Files to consider for testing',
      description: 'It must be a regular expression',
      type: 'string',
      default: '\\.js$',
    },
    testDirectory: {
      title: 'Directory with test files',
      description: 'It must be a regular expression',
      type: 'string',
      default: '^(|.*[.-_])(test|spec)s?(|[.-_].*)$',
    },
  },
};
