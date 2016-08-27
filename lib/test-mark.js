'use strict';

const {createCheck} = require ('./check.js');


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

class TestMark {
  constructor (editor, test) {
    this._test = test;
    this._mark = editor.markBufferPosition ([parseInt (test.line) - 1, 999], {invalidate: 'surround'});

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

  append () {}

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

module.exports = TestMark;
