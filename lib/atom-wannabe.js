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
    element.style.opacity         = '0.8';
    element.style.marginLeft      = '30px';
    element.style.marginTop       = `-${editor.getLineHeightInPixels ()}px`;

    return element;
  }

  static _createMarker (editor, line) {
    return editor.markBufferPosition ([line, 999], {invalidate: 'never'});
  }

  static _decorateMarker (editor, marker, element) {
    editor.decorateMarker (marker, {
      type:  'overlay',
      item:   element,
      class: 'atom-wannabe-marker'
    });
  }

  setFrames (editor, frames) {
    this._markers.forEach ((marker) => marker.destroy ());

    this._frames = frames;
    Object.keys (this._frames).forEach ((line) => {
      const element = Frames._createDump (editor, this._frames[line]);
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
