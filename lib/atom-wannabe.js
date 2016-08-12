'use babel';

const watt                  = require ('watt');
const {CompositeDisposable} = require ('atom');
const wannabe               = require ('wannabe');

class Frames {
  constructor () {
    this._frames = [];
    this._markers = [];
  }

  /**
   * Create a new element for a marker.
   *
   * @param {Object} frame
   * @return {Object} the HTML element.
   */
  static _createElement (editor, frame) {
    let text = '';

    frame.forEach ((local) => {
      text += ` ${local.name}=${local.value}`;
    })

    const element = document.createElement ('div');
    element.textContent    = text;
    element.style.position = 'relative';
    element.style.top      = `-${editor.getLineHeightInPixels ()}px`;
    element.style.left    = '20px';
    return element;
  }

  static _createMarker (editor, line) {
    return editor.markBufferPosition ([line, 999], { invalidate: 'never' });
  }

  static _decorateMarker (editor, marker, element) {
    editor.decorateMarker (marker, {
      type:  'overlay',
      item:   element,
      class: 'atom-wannabe-frame'
    });
  }

  setFrames (editor, frames) {
    this._markers.forEach ((marker) => marker.destroy ());

    this._frames = frames;
    Object.keys (this._frames).forEach ((line) => {
      const frame   = this._frames[line];
      const element = Frames._createElement (editor, frame);
      const marker  = Frames._createMarker (editor, parseInt (line) - 1);

      Frames._decorateMarker (editor, marker, element);
      this._markers.push (marker);
    });
  }
};

export default {
  _frames: new Frames (),
  subscriptions: null,

  activate (state) {
    const self = this;
    this.subscriptions = new CompositeDisposable ();

    atom.workspace.observeTextEditors ((editor) => {
      editor.onDidStopChanging (watt (function * () {
        const filePath = editor.getPath ();
        const fileText = editor.getText ();
        const line = editor.getCursorBufferPosition ().row;
        let frames = null;

        try {
          frames = yield wannabe.byLine (filePath, fileText, 'it', line);
          if (frames && Object.keys (frames).length) {
            self._frames.setFrames (editor, frames);
          } else {
            frames = yield wannabe.byPattern (filePath, fileText, 'it', /.*/);
            if (frames && Object.keys (frames).length) {
              self._frames.setFrames (editor, frames);
            }
          }
        } catch (ex) {
          console.error (ex);
        }
      }));
    });
  },

  deactivate () {
    this.subscriptions.dispose ();
  },

  serialize () {}
};
