import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseJevNameHandoff } from '../src/lib/profile/jevHandoff.mjs';

const page = await readFile(new URL('../src/components/profile/ProfileIdentityClient.tsx', import.meta.url), 'utf8');

test('parses only a validated, name-only user handoff', () => {
  assert.equal(parseJevNameHandoff('{"type":"masa-jev-name","version":1,"name":"山田太郎"}'), '山田太郎');
  assert.equal(parseJevNameHandoff('{"type":"masa-jev-name","version":1,"name":"  山田太郎  "}'), '山田太郎');
  assert.equal(parseJevNameHandoff('{"type":"masa-jev-name","version":2,"name":"山田太郎"}'), null);
  assert.equal(parseJevNameHandoff('{"type":"other","version":1,"name":"山田太郎"}'), null);
  assert.equal(parseJevNameHandoff('not-json'), null);
  assert.equal(parseJevNameHandoff('x'.repeat(513)), null);
  assert.equal(parseJevNameHandoff('{"type":"masa-jev-name","version":1,"name":"<script>"}'), null);
  assert.equal(parseJevNameHandoff('{"type":"masa-jev-name","version":1,"name":"a\\nb"}'), null);
});

test('never auto-imports, overwrites identity or auto-saves', () => {
  assert.match(page, /JEVから入力する/);
  assert.match(page, /内容を確認/);
  assert.match(page, /setJevPreview\(parsed \|\| ''\)/);
  assert.match(page, /if \(nickname\.trim\(\) \|\| jevPreview\.length > 40\) return/);
  assert.match(page, /if \(professionalName\.trim\(\) \|\| jevPreview\.length > 80\) return/);
  assert.match(page, /保存・公開も自動では行いません/);
  assert.match(page, /teacher_name_public: teacherNamePublic/);
  assert.doesNotMatch(page, /window\.localStorage\.(?:getItem|setItem)/);
});
