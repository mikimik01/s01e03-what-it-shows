import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { causeOf, dayFirst, groupByCause, sameCause, uniqueById } from '../src/lib/kb/causes.ts';
import { DEDUPE_CASES } from '../src/lib/kb/dedupe-cases.ts';
import { deskRef } from '../src/lib/kb/desk-ref.ts';

const dataRoot = new URL('../src/lib/data/', import.meta.url);
const readData = (path) => JSON.parse(readFileSync(new URL(path, dataRoot), 'utf8'));
const raw = readData('reports-4471.json');
const reports = uniqueById(raw).filter((report) => report.mergedInto === 4471);
const tenants = new Map(readdirSync(new URL('tenants/', dataRoot)).map((file) => {
  const tenant = readData('tenants/' + file);
  return [tenant.handle, tenant];
}));
const tenantOf = (report) => tenants.get(report.tenant);
const groups = groupByCause(reports, tenantOf);

test('overlapping export rows do not inflate cause counts', () => {
  assert.equal(raw.length, 427);
  assert.equal(reports.length, 412);
  assert.deepEqual(groups.map((group) => [group.cause, group.reports.length]), [['parser', 379], ['hint', 33]]);
  assert.equal(groups.reduce((sum, group) => sum + group.reports.length, 0), reports.length);
  for (const report of raw) assert.deepEqual(report, raw.find((other) => other.id === report.id));
});

test('tenant and entry path override misleading intake tags', () => {
  assert.equal(groups[0].taggedAs.hint, 23);
  assert.equal(groups[1].taggedAs.parser, 15);
  for (const id of readData('desk-notes.json').oneDayMove) {
    const report = reports.find((candidate) => candidate.id === id);
    assert.ok(report);
    assert.equal(causeOf(report, tenantOf(report)), 'parser');
  }
  assert.equal(dayFirst('de-DE'), true);
  assert.equal(dayFirst('en-US'), false);
  assert.equal(causeOf({ channel: 'form' }, { handle: 'test', name: 'test', locale: 'en-US', form: 'booking-v3' }), null);
});

test('dedupe examples compare known causes rather than subjects', () => {
  assert.deepEqual(DEDUPE_CASES.map((example) =>
    sameCause(example.a, tenantOf(example.a), example.b, tenantOf(example.b))),
  [true, false, false, true, false]);
  assert.equal(sameCause({ channel: 'email' }, undefined, { channel: 'email' }, undefined), false);
});

test('rendered incident has computed counts, signature, and current desk resolutions', () => {
  const html = readFileSync(new URL('../rendered/kb/incidents/4471-split/index.html', import.meta.url), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '');
  const source = readFileSync(new URL('../src/routes/kb/incidents/4471-split/+page.svx', import.meta.url), 'utf8');
  const signature = source.match(/^signature: (.+)$/m)?.[1];
  assert.ok(signature?.startsWith('v1.'));
  const ref = deskRef(signature);
  assert.match(ref, /^DR-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.match(html, new RegExp(`<b[^>]*>${ref}</b>`));
  assert.match(html, /<code[^>]*>parser<\/code><\/td>\s*<td[^>]*>379<\/td>/);
  assert.match(html, /<code[^>]*>hint<\/code><\/td>\s*<td[^>]*>33<\/td>/);
  assert.match(html, /<strong[^>]*>412<\/strong>/);
  assert.match(html, /5 reports read as a one-day move/);
  assert.match(html, /FIXED/);
  assert.match(html, /WON(?:'|\u2019|&#39;|&#x27;)T FIX/);
  assert.match(html, /not planned/);
  assert.match(html, /fix\(dates\): parse dd\/mm for eu locales/);
  assert.match(html, /<svg/);
  assert.match(html, /<style/);
  assert.doesNotMatch(html, /no desk ref:|href="\/kb/);
});
