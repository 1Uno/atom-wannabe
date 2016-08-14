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

  static _createCheck (editor, frames) {
    const element = document.createElement ('div');

    element.style.width           = '10px';
    element.style.borderRadius    = '5px';
    element.style.boxSizing       = 'border-box';
    element.style.borderStyle     = 'solid';
    element.style.borderWidth     = '2px'

    frames.forEach ((frame) => {
      if (frame.exception) {
        element.style.borderColor     = '#ffae59'
        element.style.backgroundColor = '#ff8200';
      } else {
        element.style.borderColor     = '#7fc479'
        element.style.backgroundColor = '#0da700';
      }
    })

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
        item:  Frames._createCheck (editor, this._frames[line]),
        class: 'atom-wannabe-marker-gutter'
      });
      this._markersFrame.push (markerTest);
    });
  }

  static _createBadge (editor, status) {
    const element = document.createElement ('div');
    element.textContent = status;

    switch (status) {
      case 'passed': {
        element.style.backgroundColor = '#1e9400';
        break;
      }
      case 'failed': {
        element.style.backgroundColor = '#af0000';
        break;
      }
      default: {
        element.style.backgroundColor = '#5c5c5c';
        break;
      }
    }

    element.style.borderRadius    = '5px';
    element.style.color           = 'white';
    element.style.paddingRight    = '5px';
    element.style.paddingLeft     = '5px';
    element.style.marginLeft      = '5px';
    element.style.marginTop       = `-${editor.getLineHeightInPixels ()}px`;

    return element;
  }

  setTests (editor, tests) {
    this._markersTest.forEach ((marker) => marker.destroy ());

    tests.forEach ((test) => {
      const element    = Frames._createBadge (editor, test.status);
      const markerTest = Frames._createMarker (editor, parseInt (test.line) - 1, 999);

      editor.decorateMarker (markerTest, {
        type:  'overlay',
        item:   element,
        class: 'atom-wannabe-marker-test'
      })
      this._markersTest.push (markerTest);
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
