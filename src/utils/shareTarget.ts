import { importAndSaveGPXFile } from "./importGPX";

const SHARE_TARGET_CACHE = 'nz-topo-share-target';
const SHARE_TARGET_PREFIX = '/shared-file-';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// The service worker responds to the share-target POST with a redirect before it has
// necessarily finished writing the shared file(s) to Cache Storage, so poll briefly.
const waitForSharedFiles = async (cache: Cache) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const keys = await cache.keys();
    const shared = keys.filter(k => new URL(k.url).pathname.startsWith(SHARE_TARGET_PREFIX));
    if (shared.length > 0) return shared;
    await sleep(200);
  }
  return [];
};

/**
 * If the page was just opened via the OS "Share" sheet with GPX file(s), imports them.
 * Safe to call unconditionally on startup; it's a no-op otherwise.
 */
export async function consumeSharedGPXFiles(): Promise<void> {
  const url = new URL(window.location.href);
  if (url.searchParams.get('share-target') !== 'gpx') return;

  // Strip the marker so refreshing/sharing the URL later doesn't re-trigger the import.
  url.searchParams.delete('share-target');
  history.replaceState(null, '', url.pathname + url.search + url.hash);

  if (!('caches' in window)) return;

  const cache = await caches.open(SHARE_TARGET_CACHE);
  const keys = await waitForSharedFiles(cache);
  if (keys.length === 0) return;

  const summaries: string[] = [];
  const errors: string[] = [];

  for (const key of keys) {
    const response = await cache.match(key);
    await cache.delete(key);
    if (!response) continue;

    const name = decodeURIComponent(response.headers.get('X-File-Name') ?? 'shared.gpx');
    const blob = await response.blob();
    const file = new File([blob], name, { type: 'application/gpx+xml' });

    try {
      summaries.push(await importAndSaveGPXFile(file));
    } catch (error) {
      errors.push(`${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  if (summaries.length > 0) {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    hashParams.set('page', 'tracks');
    location.hash = hashParams.toString();
    alert(`Successfully imported ${summaries.join(', ')}`);
  }
  if (errors.length > 0) alert(`Failed to import shared GPX:\n${errors.join('\n')}`);
}
