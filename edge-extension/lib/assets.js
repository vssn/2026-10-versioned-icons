// Reine Hilfsfunktionen ohne Browser-APIs, damit sie auch unter Node testbar sind.

// 1.2 · 1.2.0 · v1.2.0 · 1.2.0-beta.1 · 1.2.0+build.5
const VERSION = String.raw`v?\d+(?:\.\d+){1,3}(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?`;
const VERSION_SEGMENT = new RegExp(`^${VERSION}$`);
// name@1.2.0 (npm-CDNs wie unpkg, jsDelivr, esm.sh)
const AT_SEGMENT = new RegExp(`^(.+)@(${VERSION})$`);
// name-1.2.0.min.js · name_1.2.0.js · name@1.2.0.js
const FILE_NAME = new RegExp(`^(.+?)[-_@](${VERSION})((?:\\.[A-Za-z][0-9A-Za-z]*)+)$`);

/**
 * Macht aus beliebigen Eingaben einen Hostnamen:
 * " https://CDN.Example.com:8080/foo " -> "cdn.example.com", "cdn. example.com" -> "cdn.example.com".
 */
export function normalizeDomain(input) {
  let value = String(input ?? '').replace(/\s+/g, '').toLowerCase();
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  value = value.replace(/[/?#].*$/, '');
  value = value.replace(/^.*@/, '');
  value = value.replace(/^\*\./, '').replace(/^\.+|\.+$/g, '');
  if (value.startsWith('[')) return value.replace(/\]:\d+$/, ']');
  return value.replace(/:\d+$/, '');
}

export function hostMatches(hostname, domain, includeSubdomains = true) {
  if (!domain) return false;
  const host = hostname.toLowerCase();
  return host === domain || (includeSubdomains && host.endsWith(`.${domain}`));
}

function decode(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Erkennt eine Version im Pfad einer URL.
 *
 *   cdn.example.com/feat-package/1.2.0/bundle.js -> { name: 'feat-package', version: '1.2.0', file: 'bundle.js' }
 *   unpkg.com/@scope/pkg@2.0.0/dist/index.js     -> { name: '@scope/pkg', version: '2.0.0', file: 'dist/index.js' }
 *   cdn.example.com/js/jquery-3.7.1.min.js       -> { name: 'jquery', version: '3.7.1', file: 'jquery-3.7.1.min.js' }
 *
 * Gibt null zurück, wenn der Pfad keine Version enthält.
 */
export function parseVersionedAsset(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }
  const segments = url.pathname.split('/').filter(Boolean).map(decode);
  // basePath: alles vor der Version, z. B. "/npm/@lion/ui" oder "/feat-package".
  const result = (name, version, index, file, kind) => ({
    name,
    version,
    file,
    kind,
    host: url.host,
    basePath: `/${[...segments.slice(0, index), ...(kind === 'path' ? [] : [name.split('/').pop()])].join('/')}`,
  });

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const file = segments.slice(i + 1).join('/');

    const at = AT_SEGMENT.exec(segment);
    // Als letztes Segment hat "name-1.0.0-beta.js" Vorrang als Dateiname.
    if (at && (i < segments.length - 1 || !FILE_NAME.test(segment))) {
      const name = i > 0 && segments[i - 1].startsWith('@') ? `${segments[i - 1]}/${at[1]}` : at[1];
      return result(name, at[2], i, file, 'at');
    }

    if (VERSION_SEGMENT.test(segment)) {
      let name = i === 0 ? url.hostname : segments[i - 1];
      if (i > 1 && segments[i - 2].startsWith('@')) name = `${segments[i - 2]}/${name}`;
      return result(name, segment, i, file, 'path');
    }
  }

  const last = segments.length - 1;
  const fileMatch = last >= 0 ? FILE_NAME.exec(segments[last]) : null;
  if (fileMatch) return result(fileMatch[1], fileMatch[2], last, segments[last], 'file');

  return null;
}

function splitVersion(version) {
  const [main, ...pre] = version.replace(/^v/i, '').replace(/\+.*$/, '').split('-');
  return { parts: main.split('.').map(Number), pre: pre.join('-') };
}

/** Sortiert wie SemVer: 1.10.0 > 1.9.0, 1.0.0 > 1.0.0-beta. */
export function compareVersions(a, b) {
  const va = splitVersion(a);
  const vb = splitVersion(b);
  const length = Math.max(va.parts.length, vb.parts.length);
  for (let i = 0; i < length; i++) {
    const diff = (va.parts[i] ?? 0) - (vb.parts[i] ?? 0);
    if (diff) return diff;
  }
  if (va.pre === vb.pre) return a.localeCompare(b);
  if (!va.pre) return 1;
  if (!vb.pre) return -1;
  return va.pre.localeCompare(vb.pre, undefined, { numeric: true });
}

/**
 * Filtert Ressourcen nach Domain und gruppiert versionierte Pfade nach Asset-Name.
 *
 * resources: [{ url, type?, status?, fromCache?, count? }]
 * Ergebnis: { total, assets: [{ name, versions: [{ version, files: [...] }] }], others: [...] }
 */
export function analyzeResources(resources, domain, { includeSubdomains = true } = {}) {
  const seen = new Map();
  for (const resource of resources) {
    let hostname;
    try {
      hostname = new URL(resource.url).hostname;
    } catch {
      continue;
    }
    if (!hostMatches(hostname, domain, includeSubdomains)) continue;
    const known = seen.get(resource.url);
    if (known) {
      known.count += resource.count ?? 1;
      known.type ??= resource.type;
      known.status ??= resource.status;
    } else {
      seen.set(resource.url, { ...resource, count: resource.count ?? 1 });
    }
  }

  const assets = new Map();
  const others = [];
  for (const resource of seen.values()) {
    const asset = parseVersionedAsset(resource.url);
    if (!asset) {
      others.push(resource);
      continue;
    }
    if (!assets.has(asset.name)) assets.set(asset.name, new Map());
    const versions = assets.get(asset.name);
    if (!versions.has(asset.version)) versions.set(asset.version, []);
    versions.get(asset.version).push({ ...resource, ...asset });
  }

  return {
    total: seen.size,
    assets: [...assets]
      .map(([name, versions]) => ({
        name,
        versions: [...versions]
          .map(([version, files]) => ({
            version,
            files: files.sort((a, b) => a.url.localeCompare(b.url)),
          }))
          .sort((a, b) => compareVersions(b.version, a.version)),
      }))
      .sort((a, b) => b.versions.length - a.versions.length || a.name.localeCompare(b.name)),
    others: others.sort((a, b) => a.url.localeCompare(b.url)),
  };
}
