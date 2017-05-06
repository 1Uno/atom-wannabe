'use strict';

const {createCheck} = require ('./check.js');

function createLocal (frame) {
  const element = document.createElement ('div');
  element.className = 'atom-wannabe-marker-frame-div';

  let cnt = 0;
  let summary = '';

  frame.payload.locals.forEach (local => {
    if (!!local.name && local.value !== undefined) {
      const child = document.createElement ('div');
      child.className = 'atom-wannabe-marker-frame-open';
      child.textContent = `${local.name}=${local.value}`;
      element.appendChild (child);

      if (child.textContent.length < 50 - summary.length) {
        summary += child.textContent + ' ';
        ++cnt;
      }
    } else {
      ++cnt;
    }
  });

  if (cnt !== frame.payload.locals.length) {
    summary = `(${frame.payload.locals.length}) ${frame.payload.locals
      .map (local => local.name)
      .join (', ')}`;
  }

  const child = document.createElement ('div');
  child.className = 'atom-wannabe-marker-frame-summary';
  child.textContent = summary;
  element.appendChild (child);

  return element;
}

function createArgument (frame) {
  const element = document.createElement ('div');
  element.className = 'atom-wannabe-marker-frame-div';

  element.textContent = 'args';
  frame.payload.arguments.forEach (argument => {
    const child = document.createElement ('div');
    child.className = 'atom-wannabe-marker-frame-open';
    child.textContent = `${argument.name}=${argument.value}`;
    element.appendChild (child);
  });

  return element;
}

function createReturn (frame) {
  const element = document.createElement ('div');
  element.className = 'atom-wannabe-marker-frame-div';
  element.textContent = `ret:${frame.payload.returnValue.value}`;
  return element;
}

function createException (frame) {
  const element = document.createElement ('div');
  element.className = 'atom-wannabe-marker-frame-div';
  element.textContent = `ex:${frame.payload.exception.type}=${frame.payload.exception.text}`;
  return element;
}

function createConsole (frame) {
  const element = document.createElement ('div');
  element.className = 'atom-wannabe-marker-frame-div';
  element.textContent = `${frame.payload.console.type}:${frame.payload.console.text}`;
  return element;
}

function createDump (editor, frames) {
  let divs = [];

  frames.forEach (frame => {
    if (frame.payload.locals && frame.payload.locals.length > 0) {
      divs.push (createLocal (frame));
    }

    if (frame.payload.arguments && frame.payload.arguments > 0) {
      divs.push (createArgument (frame));
    }

    if (frame.payload.returnValue) {
      divs.push (createReturn (frame));
    }

    if (frame.payload.exception) {
      divs.push (createException (frame));
    }

    if (frame.payload.console) {
      divs.push (createConsole (frame));
    }
  });

  const element = document.createElement ('div');
  divs.forEach (div => element.appendChild (div));

  element.className = 'atom-wannabe-dump';
  return element;
}

function createCheckFrame (editor, frames) {
  const element = createCheck (editor);

  if (frames.some (frame => !!frame.payload.exception)) {
    element.style.backgroundColor = '#ff8200';
  } else {
    element.style.backgroundColor = '#108206';
  }

  return element;
}

class FrameMark {
  constructor (editor, frame, onlyGutter) {
    this._frames = [frame];
    this._dumpFrames = onlyGutter ? [] : [frame];
    this._editor = editor;
    this._visible = false;
    this._unconfirmed = false;
    this._event = null;

    this._create ();
  }

  dispose () {
    this._mark.destroy ();
    this._event.dispose ();
    this._visible = false;
  }

  _create () {
    const {line} = this._frames[0];
    this._mark = this._editor.markBufferPosition ([parseInt (line) - 1, 999], {
      invalidate: 'surround',
    });

    this._event = this._editor.getElement ().onDidChangeScrollTop (() => {
      const rows = this._editor.getVisibleRowRange ();
      const visible = line > rows[0] && line <= rows[1];
      this.setVisibility (visible);
    });

    const rows = this._editor.getVisibleRowRange ();
    this._visible = line > rows[0] && line <= rows[1];

    if (this._dumpFrames.length) {
      this._decorMark = this._editor.decorateMarker (this._mark, {
        type: 'overlay',
        item: createDump (this._editor, this._dumpFrames),
        class: this._visible
          ? 'atom-wannabe-marker-frame'
          : 'atom-wannabe-marker-frame-hide',
      });
    }

    this._decorGutter = this._editor
      .gutterWithName ('markerTest')
      .decorateMarker (this._mark, {
        type: 'gutter',
        item: createCheckFrame (this._editor, this._frames),
        class: 'atom-wannabe-marker-gutter',
      });
  }

  checkIfExists (frame) {
    return this._dumpFrames
      .filter (_frame => _frame.test.line === frame.test.line)
      .some (
        _frame =>
          _frame.line !== frame.line &&
          JSON.stringify (_frame.payload) === JSON.stringify (frame.payload)
      );
  }

  append (frame, onlyGutter) {
    this._frames.push (frame);
    if (!onlyGutter) {
      this._dumpFrames.push (frame);
    }
    this.dispose ();
    this._create ();
  }

  unconfirm () {
    const props = this._decorGutter.getProperties ();
    props.class = `atom-wannabe-marker-gutter-unconfirm`;
    this._decorGutter.destroy ();
    this._decorGutter = this._editor
      .gutterWithName ('markerTest')
      .decorateMarker (this._mark, props);

    this._unconfirmed = true;
    if (this._visible) {
      this.show ();
    }
  }

  hide () {
    if (!this._decorMark) {
      return;
    }

    const props = this._decorMark.getProperties ();
    props.class = `atom-wannabe-marker-frame-hide`;
    this._decorMark.destroy ();
    this._decorMark = this._editor.decorateMarker (this._mark, props);

    this._visible = false;
  }

  show () {
    if (!this._decorMark) {
      return;
    }

    const props = this._decorMark.getProperties ();
    props.class = `atom-wannabe-marker-frame`;
    if (this._unconfirmed) {
      props.class += '-unconfirm';
    }
    this._decorMark.destroy ();
    this._decorMark = this._editor.decorateMarker (this._mark, props);

    this._visible = true;
  }

  setVisibility (visible) {
    if (visible && !this._visible) {
      this.show ();
    } else if (!visible && this._visible) {
      this.hide ();
    }
  }

  get data () {
    return this._frames;
  }
}

module.exports = FrameMark;
