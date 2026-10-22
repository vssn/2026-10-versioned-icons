import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeResources, compareVersions, normalizeDomain, parseVersionedAsset } from '../lib/assets.js';

test('normalizeDomain', () => {
  assert.equal(normalizeDomain('cdn. example.com'), 'cdn.example.com');
  assert.equal(normalizeDomain(' https://CDN.Example.com:8080/feat/1.0.0/x.js?a=1 '), 'cdn.example.com');
  assert.equal(normalizeDomain('*.example.com'), 'example.com');
  assert.equal(normalizeDomain(''), '');
});

test('Version als eigenes Pfadsegment', () => {
  const asset = parseVersionedAsset('https://cdn.example.com/feat-package/1.2.0/bundle.js');
  assert.deepEqual(asset, {
    name: 'feat-package',
    version: '1.2.0',
    file: 'bundle.js',
    kind: 'path',
    host: 'cdn.example.com',
    basePath: '/feat-package',
  });
  assert.equal(parseVersionedAsset('https://cdn.example.com/libs/feat/v2.0.1-beta.3/dist/a.css').version, 'v2.0.1-beta.3');
  assert.equal(parseVersionedAsset('https://cdn.example.com/libs/feat/v2.0.1-beta.3/dist/a.css').file, 'dist/a.css');
  assert.equal(parseVersionedAsset('https://cdn.example.com/@scope/pkg/1.0.0/x.js').name, '@scope/pkg');
  assert.equal(parseVersionedAsset('https://cdn.example.com/1.0.0/x.js').name, 'cdn.example.com');
});

test('name@version (npm-CDNs)', () => {
  const asset = parseVersionedAsset('https://cdn.jsdelivr.net/npm/@lion/ui@0.14.3/dist/icon.js');
  assert.equal(asset.name, '@lion/ui');
  assert.equal(asset.version, '0.14.3');
  assert.equal(asset.file, 'dist/icon.js');
  assert.equal(asset.basePath, '/npm/@lion/ui');
  assert.equal(parseVersionedAsset('https://unpkg.com/lit@3.3.3').name, 'lit');
});

test('Version im Dateinamen', () => {
  const asset = parseVersionedAsset('https://cdn.example.com/js/jquery-3.7.1.min.js');
  assert.equal(asset.name, 'jquery');
  assert.equal(asset.version, '3.7.1');
  assert.equal(parseVersionedAsset('https://cdn.example.com/pkg@1.2.0-beta.js').version, '1.2.0-beta');
});

test('ohne Version', () => {
  assert.equal(parseVersionedAsset('https://cdn.example.com/feat-package/latest/bundle.js'), null);
  assert.equal(parseVersionedAsset('https://cdn.example.com/app.4f3a2b.js'), null);
  assert.equal(parseVersionedAsset('https://cdn.example.com/v2/api'), null);
  assert.equal(parseVersionedAsset('kaputt'), null);
});

test('compareVersions', () => {
  const sorted = ['1.10.0', '1.2.0', '1.2.0-beta.2', '1.2.0-beta.10', 'v2.0', '0.9'].sort(compareVersions);
  assert.deepEqual(sorted, ['0.9', '1.2.0-beta.2', '1.2.0-beta.10', '1.2.0', '1.10.0', 'v2.0']);
});

test('analyzeResources filtert und gruppiert', () => {
  const result = analyzeResources(
    [
      { url: 'https://cdn.example.com/feat-package/1.2.0/bundle.js' },
      { url: 'https://cdn.example.com/feat-package/1.2.0/bundle.js' },
      { url: 'https://cdn.example.com/feat-package/1.3.0/bundle.js' },
      { url: 'https://cdn.example.com/feat-package/1.3.0/style.css' },
      { url: 'https://cdn.example.com/other/2.0.0/a.js' },
      { url: 'https://cdn.example.com/logo.svg' },
      { url: 'https://example.com/index.html' },
      { url: 'https://evil-example.com/x/1.0.0/a.js' },
    ],
    'cdn.example.com',
  );
  assert.equal(result.total, 5);
  assert.deepEqual(
    result.assets.map((a) => [a.name, a.versions.map((v) => [v.version, v.files.length])]),
    [
      ['feat-package', [['1.3.0', 2], ['1.2.0', 1]]],
      ['other', [['2.0.0', 1]]],
    ],
  );
  assert.equal(result.assets[0].versions[1].files[0].count, 2);
  assert.deepEqual(result.others.map((r) => r.url), ['https://cdn.example.com/logo.svg']);

  assert.equal(analyzeResources([{ url: 'https://cdn.example.com/a' }], 'example.com').total, 1);
  assert.equal(analyzeResources([{ url: 'https://cdn.example.com/a' }], 'example.com', { includeSubdomains: false }).total, 0);
});
