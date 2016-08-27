'use babel';
'use strict';

const watt                  = require ('watt');
const {CompositeDisposable} = require ('atom');
const Wannabe               = require ('wannabe');
const MarkRegistry          = require ('./mark-registry.js');


export default {
  subscriptions: null,

  _runWannabe2: watt (function * (editor, markRegistry, filePath, fileText, extractFrom) {
    const wannabe = new Wannabe (filePath, fileText, 'it', extractFrom);
    const runner = yield wannabe.runner ();

    runner.on ('frame', (frame) => {
      const onlyGutter = markRegistry.checkIfExists (frame);
      markRegistry.createFrameMark (frame, onlyGutter);
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
