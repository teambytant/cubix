const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('lib/learn.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const lesson = { exports: {} };
new Function('exports', 'require', 'module', compiled)(lesson.exports, require, lesson);
const { advanceLesson, lessonStep } = lesson.exports;
for (const moves of [["R", "R'", "U", "U'"], ["F", "F2", "B", "B'"], ["L", "U", "L'", "U'"]]) {
  let step = 0;
  for (const [index, move] of moves.entries()) {
    step = advanceLesson(moves, step, move);
    assert.equal(step, index + 1);
  }
  assert.equal(step / moves.length, 1, 'Final move reaches 100%');
  assert.equal(advanceLesson(moves, step, 'D'), 4, 'Practice cannot undo completion');
  assert.equal(advanceLesson(moves, 2, 'D'), 0, 'Incorrect move resets unfinished task');
  assert.equal(lessonStep(moves, 3, true), 4, 'Legacy mastered 75% session recovers');
  assert.equal(lessonStep(moves, 3, false), 3, 'Unfinished saved sequence is preserved');
}
console.log('Learning progression checks passed for all three levels.');
const { keyboardMove, completedLessons, exploredControls } = lesson.exports;
assert.equal(keyboardMove('f', false, true), 'F2', 'Level 2 double turn is available from keyboard');
assert.equal(keyboardMove('b', true, false), "B'", 'Level 2 final prime is available');
assert.equal(keyboardMove('l', true, false), "L'", 'Level 3 prime is available');
assert.equal(keyboardMove('x', false, false), undefined);
assert.deepEqual(completedLessons([0, 1, 2, 3]), [0, 1, 2, 3]);
assert.deepEqual(completedLessons([0, 2, 9]), [0], 'Missing prerequisites do not unlock later lessons');
assert.deepEqual(completedLessons('invalid'), []);
assert.deepEqual(exploredControls(['U', 'U', 'R2', 'invalid', null]), ['U', 'R2']);
assert.deepEqual(exploredControls({}), []);
assert.equal(lessonStep(['U'], -5, false), 0);
assert.equal(lessonStep(['U'], NaN, false), 0);
console.log('Keyboard, unlock, and saved-progress checks passed.');
