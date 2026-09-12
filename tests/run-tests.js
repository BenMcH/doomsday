// Test suite for Doomsday Desk. No dependencies: node tests/run-tests.js (Node 18+)
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'dist', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('No inline <script> found in dist/index.html');
const script = scriptMatch[1];

// 1. The inline script must be syntactically valid on its own.
const tmpFile = path.join(os.tmpdir(), 'doomsday-desk-inline.js');
fs.writeFileSync(tmpFile, script);
execFileSync(process.execPath, ['--check', tmpFile], { stdio: 'inherit' });
console.log('syntax check passed');

// 2. Run the page script under minimal DOM stubs so its exports are reachable.
function stubElement() {
  const store = {};
  return new Proxy(function () {}, {
    get(target, prop) {
      if (prop === 'classList') return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
      if (prop === 'style') return {};
      if (prop === 'dataset') return {};
      if (prop === 'textContent' || prop === 'innerHTML' || prop === 'value' || prop === 'className' || prop === 'disabled') {
        return store[prop] !== undefined ? store[prop] : '';
      }
      return () => stubElement();
    },
    set(target, prop, value) { store[prop] = value; return true; },
    apply() { return stubElement(); },
  });
}
global.document = { querySelector: () => stubElement(), querySelectorAll: () => [] };
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

eval(script); // eslint-disable-line no-eval

const D = global.Doomsday;
if (!D) throw new Error('Page script did not expose window.Doomsday');
console.log('page script loaded and exported its helpers');

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
let failures = 0;
const fail = msg => { failures++; console.error('FAIL: ' + msg); };
const check = (cond, msg) => { if (!cond) fail(msg); };

// 3. The Doomsday math must match the JavaScript engine for every date 1583-2400.
let count = 0;
for (const d = new Date(Date.UTC(1583, 0, 1)); d <= new Date(Date.UTC(2400, 11, 31)); d.setUTCDate(d.getUTCDate() + 1)) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  const got = D.doomsdayWeekday(y, m, day), want = d.getUTCDay();
  if (got !== want) {
    fail(`doomsdayWeekday(${y}, ${m}, ${day}) = ${days[got]}, but the engine says ${days[want]}`);
    if (failures > 5) break;
  }
  count++;
}
console.log(`doomsdayWeekday matched the engine for ${count} consecutive dates (1583-01-01 … 2400-12-31)`);

// 4. The walkthrough shown to the user must agree with the checked answer.
let seed = 42;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let i = 0; i < 500; i++) {
  const y = 1583 + Math.floor(rand() * 818);
  const m = 1 + Math.floor(rand() * 12);
  const d = 1 + Math.floor(rand() * new Date(Date.UTC(y, m, 0)).getUTCDate());
  const s = D.solutionSteps(y, m, d);
  check(days.indexOf(s.weekday) === D.doomsdayWeekday(y, m, d), `walkthrough weekday mismatch for ${y}-${m}-${d}`);
  check(s.sum === s.twelves + s.rem + s.fours, `walkthrough sum mismatch for ${y}-${m}-${d}`);
  check(s.offset === (((d - D.monthAnchor(y, m)) % 7) + 7) % 7, `walkthrough offset mismatch for ${y}-${m}-${d}`);
  check(days.indexOf(s.century) === D.centuryAnchor(y), `walkthrough century mismatch for ${y}-${m}-${d}`);
  check(days.indexOf(s.doomsday) === D.yearAnchor(y), `walkthrough year anchor mismatch for ${y}-${m}-${d}`);
}
console.log('walkthrough agreed with the calendar for 500 random dates');

// 5. Leap-year and century edge cases.
const spot = [
  [1969, 7, 20, 'Sunday'], [2000, 1, 1, 'Saturday'], [1900, 1, 1, 'Monday'],
  [2100, 3, 1, 'Monday'], [1583, 1, 1, 'Saturday'], [2400, 2, 29, 'Tuesday'],
  [2000, 2, 29, 'Tuesday'], [1900, 2, 28, 'Wednesday'], [2024, 1, 4, 'Thursday'],
];
for (const [y, m, d, want] of spot) check(days[D.doomsdayWeekday(y, m, d)] === want, `${y}-${m}-${d} should be ${want}`);
check(D.leap(2000) && D.leap(2024) && !D.leap(1900) && !D.leap(2100), 'leap-year rule is wrong for century years');
console.log('edge cases passed');

// 6. Page-level assertions that the deploy artifact carries what we expect.
for (const needle of ['name="description"', 'property="og:title"', 'property="og:url"', 'rel="canonical"', 'rel="icon"', 'name="viewport"', 'aria-pressed=', 'id="solutionSteps"']) {
  check(html.includes(needle), `dist/index.html is missing ${needle}`);
}
check(fs.existsSync(path.join(root, 'dist', '404.html')), 'dist/404.html is missing');
console.log('page checks passed');

if (failures) {
  console.error(`${failures} failure(s)`);
  process.exit(1);
}
console.log('All tests passed.');
