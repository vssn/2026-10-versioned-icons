import { analyzeResources, normalizeDomain } from './lib/assets.js';

const $ = (selector) => document.querySelector(selector);
const domainInput = $('#domain');
const subdomainsInput = $('#subdomains');
const results = $('#results');
const summary = $('#summary');

// Als normale Seite geöffnet (popup.html?tabId=123) statt als Popup.
const params = new URLSearchParams(location.search);
const pinnedTabId = params.has('tabId') ? Number(params.get('tabId')) : undefined;
if (pinnedTabId !== undefined) document.body.classList.add('page');

const state = {
  scope: 'tab',
  tab: undefined,
  // Ressourcen, die schon vor dem Start der Aufzeichnung geladen wurden (Performance API der Seite).
  pageEntries: [],
  analysis: undefined,
};

function h(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') element.className = value;
    else if (key.startsWith('on')) element.addEventListener(key.slice(2), value);
    else element.setAttribute(key, value === true ? '' : value);
  }
  element.append(...children.flat().filter((child) => child !== undefined && child !== null && child !== false));
  return element;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

async function getTab() {
  if (pinnedTabId !== undefined) return chrome.tabs.get(pinnedTabId).catch(() => undefined);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function readPageEntries(tabId) {
  try {
    const frames = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => [
        { url: location.href, type: 'document', count: 0 },
        ...performance.getEntriesByType('resource').map((entry) => ({ url: entry.name, type: entry.initiatorType, count: 0 })),
      ],
    });
    return frames.flatMap((frame) => frame.result ?? []);
  } catch {
    // z. B. edge://-Seiten oder der Add-ons-Store: dort darf nichts injiziert werden.
    return [];
  }
}

async function readRecordedResources() {
  if (state.scope === 'tab') {
    if (!state.tab) return [];
    const key = `tab:${state.tab.id}`;
    const stored = await chrome.storage.session.get(key);
    return [...Object.values(stored[key]?.resources ?? {}), ...state.pageEntries];
  }
  const all = await chrome.storage.session.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith('tab:'))
    .flatMap(([, record]) => Object.values(record.resources ?? {}));
}

function relativeFile(file) {
  const url = new URL(file.url);
  return (file.file || url.pathname.split('/').pop() || '/') + url.search;
}

function meta(resource) {
  const parts = [];
  if (resource.type) parts.push(resource.type);
  if (resource.status !== undefined) parts.push(resource.status);
  if (resource.fromCache) parts.push('Cache');
  if (resource.count > 1) parts.push(`${resource.count}×`);
  const failed = typeof resource.status === 'string' || resource.status >= 400;
  return h('span', { class: failed ? 'meta error' : 'meta' }, parts.join(' · '));
}

function link(url, text) {
  return h('a', { href: url, title: url, target: '_blank', rel: 'noreferrer' }, text);
}

function renderAsset(asset) {
  const multiple = asset.versions.length > 1;
  return h(
    'details',
    { open: multiple },
    h(
      'summary',
      {},
      h('span', { class: 'asset-name' }, asset.name),
      asset.versions.map((v) => h('span', { class: 'chip' }, v.version)),
      multiple && h('span', { class: 'badge-warn' }, `${asset.versions.length} Versionen`),
    ),
    asset.versions.map((v) => {
      const bases = [...new Set(v.files.map((file) => `${file.host}${file.basePath}`))];
      return h(
        'div',
        { class: 'version' },
        h(
          'div',
          { class: 'version-head' },
          h('span', { class: 'chip' }, v.version),
          h('span', { class: 'base' }, bases.join(', ')),
        ),
        h(
          'ul',
          { class: 'files' },
          v.files.map((file) => h('li', {}, link(file.url, relativeFile(file)), meta(file))),
        ),
      );
    }),
  );
}

function render() {
  const domain = normalizeDomain(domainInput.value);
  $('#reload').hidden = state.scope !== 'tab';
  results.replaceChildren();

  if (!domain) {
    summary.textContent = '';
    results.append(
      h('p', { class: 'hint' }, 'Domain eingeben, z. B. „cdn.example.com“ oder „example.com“ (mit Subdomains).'),
    );
    return;
  }

  const analysis = state.analysis;
  const multi = analysis.assets.filter((asset) => asset.versions.length > 1).length;
  summary.textContent =
    `${analysis.total} Ressourcen · ${analysis.assets.length} Assets` + (multi ? ` · ${multi} mit mehreren Versionen` : '');

  if (!analysis.total) {
    results.append(
      h(
        'p',
        { class: 'hint' },
        `Keine Ressourcen von ${domain} gefunden. `,
        state.scope === 'tab'
          ? 'Lade den Tab neu, damit alle Requests von Anfang an erfasst werden.'
          : 'Es wurden in keinem Tab Requests an diese Domain aufgezeichnet.',
      ),
    );
    return;
  }

  if (analysis.assets.length) {
    results.append(h('h2', {}, 'Versionierte Assets'), ...analysis.assets.map(renderAsset));
  }
  if (analysis.others.length) {
    results.append(
      h('h2', {}, `Weitere Ressourcen (${analysis.others.length})`),
      h(
        'details',
        { open: !analysis.assets.length },
        h('summary', {}, 'Ohne Version im Pfad'),
        h(
          'ul',
          { class: 'others' },
          analysis.others.map((resource) => {
            const url = new URL(resource.url);
            return h('li', {}, link(resource.url, url.host + url.pathname + url.search), meta(resource));
          }),
        ),
      ),
    );
  }
}

async function refresh() {
  const domain = normalizeDomain(domainInput.value);
  const resources = domain ? await readRecordedResources() : [];
  state.analysis = analyzeResources(resources, domain, { includeSubdomains: subdomainsInput.checked });
  render();
}

function saveSettings() {
  chrome.storage.local.set({
    domain: domainInput.value.trim(),
    includeSubdomains: subdomainsInput.checked,
    scope: state.scope,
  });
}

const onSettingsChange = debounce(() => {
  saveSettings();
  refresh();
}, 150);

domainInput.addEventListener('input', onSettingsChange);
subdomainsInput.addEventListener('change', onSettingsChange);
document.querySelectorAll('input[name="scope"]').forEach((radio) =>
  radio.addEventListener('change', () => {
    state.scope = radio.value;
    onSettingsChange();
  }),
);
$('#settings').addEventListener('submit', (event) => event.preventDefault());

$('#reload').addEventListener('click', async () => {
  if (!state.tab) return;
  state.pageEntries = [];
  await chrome.tabs.reload(state.tab.id, { bypassCache: true });
});

$('#clear').addEventListener('click', async () => {
  state.pageEntries = [];
  await chrome.runtime.sendMessage({ type: 'clear', tabId: state.scope === 'tab' ? state.tab?.id : undefined });
  refresh();
});

$('#copy').addEventListener('click', async (event) => {
  const { assets = [], others = [] } = state.analysis ?? {};
  const data = {
    domain: normalizeDomain(domainInput.value),
    page: state.scope === 'tab' ? state.tab?.url : undefined,
    assets: assets.map((asset) => ({
      name: asset.name,
      versions: asset.versions.map((v) => ({ version: v.version, files: v.files.map((file) => file.url) })),
    })),
    others: others.map((resource) => resource.url),
  };
  await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  const button = event.currentTarget;
  button.textContent = 'Kopiert ✓';
  setTimeout(() => (button.textContent = 'JSON'), 1200);
});

// Live-Aktualisierung, während die Seite weiter lädt.
const onRecordChange = debounce(refresh, 200);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session') return;
  if (state.scope === 'all' || (state.tab && `tab:${state.tab.id}` in changes)) onRecordChange();
});

async function init() {
  const settings = await chrome.storage.local.get({ domain: '', includeSubdomains: true, scope: 'tab' });
  domainInput.value = settings.domain;
  subdomainsInput.checked = settings.includeSubdomains;
  state.scope = settings.scope;
  document.querySelector(`input[name="scope"][value="${settings.scope}"]`).checked = true;

  state.tab = await getTab();
  if (state.tab?.id !== undefined) state.pageEntries = await readPageEntries(state.tab.id);
  await refresh();
  domainInput.select();
}

init();
