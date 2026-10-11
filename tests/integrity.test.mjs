import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('every local src/href in index.html exists', () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map((m) => m[1]).filter((u) => !/^https?:/.test(u));
  assert.ok(refs.length >= 3);
  for (const r of refs) assert.ok(fs.existsSync(path.join(ROOT, r)), `missing ${r}`);
});

test('no external scripts, analytics or trackers', () => {
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  for (const s of scripts) assert.ok(!/^https?:/.test(s), `external script ${s}`);
  assert.doesNotMatch(html, /google-analytics|googletagmanager|gtag\(|fetch\(|XMLHttpRequest|sendBeacon/);
});

test('logo and favicon are self-contained SVGs', () => {
  for (const f of ['assets/galaxy-math-logo.svg', 'assets/favicon.svg']) {
    const svg = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /<\/svg>\s*$/);
    assert.doesNotMatch(svg, /<image|xlink:href|href="http|<script/);
  }
});

test('page title is Galaxy Math, not the old prototype title', () => {
  assert.match(html, /<title>Galaxy Math<\/title>/);
  assert.doesNotMatch(html, /Flashcard Prototype/);
});
