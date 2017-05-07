'use strict';

const {createCheck} = require ('./check.js');

const createCheckTest = (editor, test) => {
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
};

class TestMark {
  constructor (atomWannabe, editor, test) {
    this._unconfirmed = false;
    this._test = test;
    this._editor = editor;
    this._atomWannabe = atomWannabe;

    this._mark = this._editor.markBufferPosition (
      [parseInt (test.line) - 1, 999],
      {invalidate: 'surround'}
    );

    this._event = this._editor.getElement ().onDidChangeScrollTop (() => {
      const rows = this._editor.getVisibleRowRange ();
      const visible = test.line > rows[0] && test.line <= rows[1];
      this.setVisibility (visible);
    });

    const rows = this._editor.getVisibleRowRange ();
    this._visible = test.line > rows[0] && test.line <= rows[1];

    this._decorMark = this._editor.decorateMarker (this._mark, {
      type: 'overlay',
      item: this._createBadge (test),
      class: this._visible
        ? 'atom-wannabe-marker-test'
        : 'atom-wannabe-marker-test-hide',
    });

    this._decorGutter = this._editor
      .gutterWithName ('markerTest')
      .decorateMarker (this._mark, {
        type: 'gutter',
        item: createCheckTest (this._editor, test),
        class: 'atom-wannabe-marker-gutter',
      });
  }

  _createBadge (test) {
    const envelop = document.createElement ('div');
    envelop.className = 'atom-wannabe-badge-envelop';

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
        element.className = 'atom-wannabe-badge-passed';
        break;
      }
      case 'failed': {
        element.className = 'atom-wannabe-badge-failed';
        break;
      }
      default: {
        element.className = 'atom-wannabe-badge-unknown';
        break;
      }
    }

    const refresh = document.createElement ('span');
    refresh.className = 'atom-wannabe-badge-refresh';
    refresh.textContent = '↺';
    refresh.onclick = () => {
      refresh.style = 'visibility: hidden;';
      this._atomWannabe.runAll ();
    };

    envelop.appendChild (element);
    envelop.appendChild (refresh);

    return envelop;
  }

  dispose () {
    this._mark.destroy ();
    this._event.dispose ();
    this._visible = false;
  }

  append () {}

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
    props.class = `atom-wannabe-marker-test-hide`;
    this._decorMark.destroy ();
    this._decorMark = this._editor.decorateMarker (this._mark, props);

    this._visible = false;
  }

  show () {
    if (!this._decorMark) {
      return;
    }

    const props = this._decorMark.getProperties ();
    props.class = `atom-wannabe-marker-test`;
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
    return this._test;
  }
}

module.exports = TestMark;
