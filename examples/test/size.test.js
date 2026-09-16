// Run me: node test/size.test.js
// Exit 0 is green, anything else is red. Zero dependencies on purpose.
import assert from 'node:assert/strict';
import { isSmall, sizeOf } from '../src/size.js';

let ran = 0;
function 검사(name, fn) { fn(); ran += 1; console.log(`  ok  ${name}`); }

// This is the red test from round 1. It was written and watched fail before
// src/size.js was touched. Before the fix it printed:
//   AssertionError: Expected values to be strictly equal: true !== false
검사('a 32B model is not small, even though "32b" contains "2b"', () => {
  assert.equal(isSmall('qwen2.5-coder:32b'), false);
  assert.equal(isSmall('llama3:13b'), false);
  assert.equal(isSmall('mixtral:8x22b'), false);
});

// The boundary is exclusive. Without this assertion, `< 8` and `<= 8` are
// indistinguishable, and a mutant that changes one to the other leaks.
검사('8B is on the not-small side of the boundary', () => {
  assert.equal(isSmall('llama3.1:8b'), false);
  assert.equal(sizeOf('llama3.1:8b'), 8);
});

검사('models under 8B are small', () => {
  assert.equal(isSmall('gemma:2b'), true);
  assert.equal(isSmall('phi3:3.8b'), true);
  assert.equal(isSmall('qwen2.5:0.5b'), true);
});

// The name is "reads the size out of the name", so it has to ask about a name
// that has no size in it. A test whose name promises more than its assertions
// check is defect class 3, and it is the easiest one to write by accident.
검사('a name with no size in it reads as unknown, not as small', () => {
  assert.equal(sizeOf('codestral'), null);
  assert.equal(isSmall('codestral'), false);
});

검사('the size is read as a number, not as a string', () => {
  assert.equal(sizeOf('qwen2.5-coder:32b'), 32);
  assert.equal(sizeOf('phi3:3.8b'), 3.8);
});

console.log(`\n  ${ran} pass / 0 fail / 0 skip — 1 of 1 files exited cleanly`);
