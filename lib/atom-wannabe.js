'use babel';

const watt                  = require ('watt');
const {CompositeDisposable} = require ('atom');
const wannabe               = require ('wannabe');

class Frames {
  constructor () {
    this._frames = [];
    this._markersFrame = [];
    this._markersTest = [];
  }

  /**
   * Create a new element for a marker.
   *
   * @param {Object} frames
   * @return {Object} the HTML element.
   */
  static _createDump (editor, frames) {
    let text = '';

    frames.forEach ((frame) => {
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
        text += ` ${frame.exception.type}=${frame.exception.text}`
      }
    });

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

  static _createCheck (editor) {
    const element    = document.createElement ('div');
    const lineHeight = editor.getLineHeightInPixels ();

    element.style.position     = 'relative';
    element.style.top          = '0.2em';
    element.style.width        = `1em`;
    element.style.maxHeight    = `1em`;
    element.style.minHeight    = `1em`;
    element.style.borderRadius = '2px';
    element.style.boxSizing    = 'border-box';

    return element;
  }

  static _createCheckFrame (editor, frames) {
    const element = Frames._createCheck (editor);

    frames.forEach ((frame) => {
      if (frame.exception) {
        element.style.backgroundColor = '#ff8200';
      } else {
        element.style.backgroundColor = '#108206';
      }
    })

    return element;
  }

  static _createCheckTest (editor, test) {
    const element = Frames._createCheck (editor);

    switch (test.status) {
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

  static _createMarker (editor, line, column) {
    return editor.markBufferPosition ([line, column], {invalidate: 'surround'});
  }

  setFrames (editor, frames) {
    this._markersFrame.forEach ((marker) => marker.destroy ());

    this._frames = frames;

    Object.keys (this._frames).forEach ((line) => {
      const element     = Frames._createDump (editor, this._frames[line]);
      const markerFrame = Frames._createMarker (editor, parseInt (line) - 1, 999);
      const markerTest  = Frames._createMarker (editor, parseInt (line) - 1, 0);

      editor.decorateMarker (markerFrame, {
        type:  'overlay',
        item:   element,
        class: 'atom-wannabe-marker-frame'
      });
      this._markersFrame.push (markerFrame);

      editor.gutterWithName ('markerTest').decorateMarker (markerTest, {
        type:  'gutter',
        item:  Frames._createCheckFrame (editor, this._frames[line]),
        class: 'atom-wannabe-marker-gutter'
      });
      this._markersFrame.push (markerTest);
    });
  }

  static _createBadge (editor, test) {
    const element = document.createElement ('div');
    element.textContent = `${test.status || 'unknown'}`;
    if (test.duration) {
      element.textContent += ` (${test.duration}ms)`;
    }

    switch (test.status) {
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

  setTests (editor, tests) {
    this._markersTest.forEach ((marker) => marker.destroy ());

    tests.forEach ((test) => {
      const element    = Frames._createBadge (editor, test);
      const markerTest = Frames._createMarker (editor, parseInt (test.line) - 1, 999);

      editor.decorateMarker (markerTest, {
        type:  'overlay',
        item:   element,
        class: 'atom-wannabe-marker-test'
      })
      this._markersTest.push (markerTest);

      editor.gutterWithName ('markerTest').decorateMarker (markerTest, {
        type:  'gutter',
        item:  Frames._createCheckTest (editor, test),
        class: 'atom-wannabe-marker-gutter'
      });
      this._markersFrame.push (markerTest);
    });
  }
};

export default {
  _frames: new Frames (),
  subscriptions: null,

  _runWannabe: watt (function * (editor, framesObj) {
    const filePath = editor.getPath ();
    const fileText = editor.getText ();
    const line = editor.getCursorBufferPosition ().row;

    const {frames, tests} = yield wannabe.byLine (filePath, fileText, 'it', line);
    if (frames && Object.keys (frames).length) {
      framesObj.setFrames (editor, frames);
      framesObj.setTests (editor, tests);
    } else {
      const {frames, tests} = yield wannabe.byPattern (filePath, fileText, 'it', /.*/);
      if (frames && Object.keys (frames).length) {
        framesObj.setFrames (editor, frames);
        framesObj.setTests (editor, tests);
      }
    }
  }),

  activate (state) {
    const self = this;
    this.subscriptions = new CompositeDisposable ();

    atom.workspace.observeTextEditors ((editor) => {
      editor.addGutter ({name: 'markerTest'});

      let edited = 0;

      editor.onDidStopChanging (watt (function * () {
        ++edited;
        if (edited > 1) {
          return;
        }

        while (edited > 0) {
          try {
            yield self._runWannabe (editor, self._frames);
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
    this._markersFrame.forEach ((marker) => marker.destroy ());
    this._markersTest.forEach ((marker) => marker.destroy ());
    this.subscriptions.dispose ();
  },

  serialize () {}
};
