// Zeichnet alle Requests pro Tab auf, damit das Popup sie nach Domain filtern kann.
// Der Service Worker kann jederzeit beendet werden, daher liegt der Stand in
// chrome.storage.session (bleibt bis zum Browser-Neustart erhalten).

const MAX_RESOURCES_PER_TAB = 3000;
const SAVE_DELAY_MS = 300;

const tabKey = (tabId) => `tab:${tabId}`;
const isWebUrl = (url) => /^(https?|wss?):/.test(url);
const records = new Map(); // tabId -> Promise<{ pageUrl, resources: { [url]: resource } }>
const saveTimers = new Map();

function getRecord(tabId) {
  if (!records.has(tabId)) {
    const key = tabKey(tabId);
    records.set(
      tabId,
      chrome.storage.session.get(key).then((stored) => stored[key] ?? { pageUrl: '', resources: {} }),
    );
  }
  return records.get(tabId);
}

function scheduleSave(tabId) {
  clearTimeout(saveTimers.get(tabId));
  saveTimers.set(
    tabId,
    setTimeout(async () => {
      saveTimers.delete(tabId);
      const record = await records.get(tabId);
      if (!record) return;
      try {
        await chrome.storage.session.set({ [tabKey(tabId)]: record });
      } catch (error) {
        console.warn('Speichern fehlgeschlagen', tabId, error);
      }
    }, SAVE_DELAY_MS),
  );
}

async function addResource(details, status) {
  if (!isWebUrl(details.url)) return;
  const record = await getRecord(details.tabId);
  const known = record.resources[details.url];
  if (known) {
    known.count += 1;
    known.status = status;
  } else {
    if (Object.keys(record.resources).length >= MAX_RESOURCES_PER_TAB) return;
    record.resources[details.url] = {
      url: details.url,
      type: details.type,
      status,
      fromCache: Boolean(details.fromCache),
      time: Math.round(details.timeStamp),
      count: 1,
    };
  }
  if (details.type === 'main_frame') record.pageUrl = details.url;
  scheduleSave(details.tabId);
}

const filter = { urls: ['<all_urls>'] };

// Neue Seite im Tab: alte Aufzeichnung verwerfen.
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0 || !isWebUrl(details.url)) return;
    records.set(details.tabId, Promise.resolve({ pageUrl: details.url, resources: {} }));
    scheduleSave(details.tabId);
  },
  { ...filter, types: ['main_frame'] },
);

chrome.webRequest.onCompleted.addListener((details) => {
  addResource(details, details.statusCode);
}, filter);

chrome.webRequest.onErrorOccurred.addListener((details) => {
  addResource(details, details.error);
}, filter);

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTimeout(saveTimers.get(tabId));
  saveTimers.delete(tabId);
  records.delete(tabId);
  chrome.storage.session.remove(tabKey(tabId));
});

// Popup -> "Leeren"
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'clear') return;
  const tabIds = message.tabId === undefined ? [...records.keys()] : [message.tabId];
  for (const tabId of tabIds) {
    records.set(tabId, Promise.resolve({ pageUrl: '', resources: {} }));
    clearTimeout(saveTimers.get(tabId));
    saveTimers.delete(tabId);
  }
  const done =
    message.tabId === undefined
      ? chrome.storage.session.get(null).then((all) =>
          chrome.storage.session.remove(Object.keys(all).filter((key) => key.startsWith('tab:'))),
        )
      : chrome.storage.session.remove(tabKey(message.tabId));
  done.then(() => sendResponse({ ok: true }));
  return true;
});
