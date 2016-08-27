'use babel';
'use strict';

const watt                  = require ('watt');
const {CompositeDisposable} = require ('atom');
const Wannabe               = require ('wannabe');
const MarkRegistry          = require ('./mark-registry.js');


class WannabeRunner {
  constructor (editor) {
    this._editor       = editor;
    this._markRegistry = new MarkRegistry (this._editor);

    this._editor.addGutter ({name: 'markerTest'});
    watt.wrapAll (this);
  }

  * _run (filePath, fileText, extractFrom) {
    const wannabe = new Wannabe (
      filePath,
      fileText,
      new RegExp (atom.config.get ('atom-wannabe.funcNames')),
      extractFrom
    );
    const runner = yield wannabe.runner ();

    runner.on ('frame', (frame) => {
      const onlyGutter = this._markRegistry.checkIfExists (frame);
      this._markRegistry.createFrameMark (frame, onlyGutter);
    });

    runner.on ('test', (test) => {
      this._markRegistry.createTestMark (test);
    });

    const {frames, tests} = yield wannabe.run ();
    if (frames && Object.keys (frames).length) {
      return tests;
    }
    return null;
  }

  * run () {
    const filePath = this._editor.getPath ();
    const fileText = this._editor.getText ();
    const line     = this._editor.getCursorBufferPosition ().row;

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
    }
  }

  dispose () {
    this._markRegistry.dispose ();
  }
}

export default {
  subscriptions: null,

  activate () {
    this.subscriptions = new CompositeDisposable ();

    atom.workspace.observeTextEditors ((editor) => {
      const wannabeRunner = new WannabeRunner (editor);

      let edited = 0;

      this.subscriptions.add (editor.onDidStopChanging (watt (function * () {
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
      })));

      this.subscriptions.add (editor.onDidDestroy (() => {
        wannabeRunner.dispose ();
      }));
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
      default: '^(it|specify|test)$'
    }
  }
};
