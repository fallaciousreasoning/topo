const CACHE_VERSION = 1;
const CACHE_NAME = `nz-topo-cache-v${CACHE_VERSION}`;

// Used to hand shared files off from the share-target POST to the page it redirects to.
const SHARE_TARGET_CACHE = 'nz-topo-share-target';
const SHARE_TARGET_PREFIX = '/shared-file-';

// Decide whether we should try and save data.
const shouldConserveData = () => {
  const connection = navigator.connection;
  if (!connection)
    return false;

  if (connection.saveData)
    return true;

  return connection.type === "cellular";
};

// Download assets necessary to work offline. Includes everything place lookups (getPlaces,
// tapping a peak for route info, ...) need, so they work offline without having happened to be
// fetched online first.
const FIRST_RUN_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg',
  '/global.css',
  '/build/tailwind.css',
  '/icons/marker.svg',
  '/icons/location-indicator.svg',
  '/data/huts.json',
  '/data/peaks.json',
  '/data/regions.json',
  '/data/protectedAreas.json',
  '/data/waterFeatures.json',
  '/data/landforms.json',
  '/data/geologicalFeatures.json',
  '/data/glaciers.json',
  '/data/ridges.json',
  '/data/localities.json',
  'https://search.topos.nz/data/min_excluded_places.json',
  'https://raw.githubusercontent.com/fallaciousreasoning/nz-mountains/main/mountains.json',
];

// The build's hashed JS/CSS/worker files, whose names change every build so can't be listed
// above. Filled in at build time by the precacheBuildAssets plugin in vite.config.mts - which
// also means this file's bytes change on every deploy, which is what makes the browser install
// the new worker at all. Stays empty under the dev server.
const BUILD_ASSETS = [];

const downloadFirstRunAssets = async () => {
  const cache = await caches.open(CACHE_NAME);
  const urls = [...FIRST_RUN_ASSETS, ...BUILD_ASSETS];
  // Added individually rather than via cache.addAll, which is all-or-nothing: a single missing
  // entry (e.g. '/build/main.js', which no longer exists since the move to Vite's hashed
  // assets) silently meant nothing at all got precached.
  const results = await Promise.allSettled(urls.map(url => cache.add(url)));
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.warn('[ServiceWorker] Failed to precache', urls[i], r.reason);
  });
};

// Synthetic cache key (never fetched) holding the BUILD_ASSETS of the last worker to activate.
const LAST_BUILD_ASSETS_KEY = '/__sw/last-build-assets.json';

// Hashed assets are never overwritten, only superseded, so without this every deploy's JS/CSS
// would stay in the cache forever. The previous build's assets are kept for one more deploy: a
// tab left open across a deploy is still running that build, and may yet start a worker script
// it hadn't loaded (e.g. routing, once a route is drawn) - possibly while offline.
const pruneOldBuildAssets = async () => {
  if (!BUILD_ASSETS.length) return;
  const cache = await caches.open(CACHE_NAME);
  const lastBuild = await cache.match(LAST_BUILD_ASSETS_KEY);
  // No record yet (first activate since this was added): we can't tell which cached assets an
  // open tab might still need, so leave them all until the next deploy.
  if (!lastBuild) {
    await cache.put(LAST_BUILD_ASSETS_KEY, new Response(JSON.stringify(BUILD_ASSETS)));
    return;
  }
  const keep = new Set([...BUILD_ASSETS, ...await lastBuild.json()]);
  for (const request of await cache.keys()) {
    const url = new URL(request.url);
    if (url.origin === self.location.origin && url.pathname.startsWith('/assets/') && !keep.has(url.pathname)) {
      await cache.delete(request);
    }
  }
  await cache.put(LAST_BUILD_ASSETS_KEY, new Response(JSON.stringify(BUILD_ASSETS)));
};

self.addEventListener('install', function (e) {
  console.log('[ServiceWorker] Install');
  e.waitUntil(downloadFirstRunAssets()
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', function (e) {
  console.log('[ServiceWorker] Activate');
  e.waitUntil(pruneOldBuildAssets()
    .catch(err => console.warn('[ServiceWorker] Failed to prune old assets', err))
    .then(() => self.clients.claim()));
});

const cache = async (request, response) => {
  if (response.then)
    response = await response;

  const copy = response.clone();

  if (copy.ok) {
    const store = await caches.open(CACHE_NAME);
    await store.put(request, copy);
  }

  // Return the response, to make this thenable.
  return response;
}

// How long networkThenCache waits on the network before falling back to a cached copy. On a weak
// connection a request often doesn't fail, it just crawls, so without this the cache is never used.
const NETWORK_TIMEOUT_MS = 5000;

const networkThenCache = async e => {
  const fetchPromise = fetch(e.request).then(r => cache(e.request, r));
  // Keep the worker alive until the fetch settles, so a slow response still updates the cache
  // even when the cached copy was served instead.
  e.waitUntil(fetchPromise.catch(() => {}));

  const timedOut = Symbol('timedOut');
  const timeout = new Promise(resolve => setTimeout(resolve, NETWORK_TIMEOUT_MS, timedOut));
  try {
    const result = await Promise.race([fetchPromise, timeout]);
    if (result !== timedOut) return result;
  } catch {
    return caches.match(e.request);
  }

  // The network is slow: race it against the cache, responding with whichever produces a
  // response first. A cache miss doesn't win the race, nor does a network failure.
  const cachePromise = caches.match(e.request);
  return new Promise(resolve => {
    let remaining = 2;
    const settle = response => {
      if (response) resolve(response);
      else if (--remaining === 0) resolve(undefined);
    };
    cachePromise.then(settle, () => settle(undefined));
    fetchPromise.then(settle, () => settle(undefined));
  });
}

const cacheThenNetwork = async e => {
  const cached = await caches.match(e.request);
  if (cached)
    return cached;

  return fetch(e.request).then(r => cache(e.request, r));
}

const raceNetworkAndCache = async (e) => {
  const cachePromise = caches.match(e.request);
  const fetchPromise = fetch(e.request);

  // Gets a promise returning a clone of the fetch request.
  const getFetchResponseClone = () => fetchPromise.then(r => r.clone());

  // Always update what's in the cache whatever it is we tried to fetch.
  e.waitUntil(cache(e.request, getFetchResponseClone()));

  const responseToReturn = getFetchResponseClone();
  // If the cache doesn't have the request, try and fetch it from the network.
  const cachedOrNetwork = cachePromise
    .then(response => response || responseToReturn)
    .catch(() => responseToReturn);

  // If the network encounters an error, try and return a cached response.
  const networkOrCache = responseToReturn
    .catch(() => cachePromise);

  // Promise.race throws an error if either promise rejects, so be careful
  // that neither promise can throw.
  return Promise.race([cachedOrNetwork, networkOrCache]);
};


// Use a different different strategy to conserve data.
const maybeConserve = (normal, conservative) => {
  return (e) => shouldConserveData() ? conservative(e) : normal(e);
};

// Map regexes to a strategy.
const rules = {
  // Lookup data (huts, peaks, places...) is served from cache straight away and refreshed in the
  // background. Network-first meant every location lookup waited on the network, which on a weak
  // connection (as opposed to none) just stalls rather than failing over to the cache. Must come
  // before the scope rule below, since rules are matched in order.
  [`${self.registration.scope}data/`]: raceNetworkAndCache,

  // First party scripts should be fetched from the network, if possible.
  [self.registration.scope]: networkThenCache,

  // Mountain/route data: 5MB+, so same reasoning as the lookup data above.
  "https://raw.githubusercontent.com/fallaciousreasoning/nz-mountains/main/mountains.json": raceNetworkAndCache,

  // Use search data from cache.
  'https://search.topos.nz/data/min_excluded_places.json': cacheThenNetwork,

  // Cache the routing graph on first load (not eagerly prefetched).
  'https://data.topos.nz/tracks.tg': cacheThenNetwork,
}

// Strategies resolve to undefined when neither the network nor the cache has a response, which
// respondWith rejects ("Failed to convert value to 'Response'"). Page loads fall back to the
// cached app shell instead - it's a single-page app, so every route is the same HTML - and
// anything else gets a proper network error.
const withFallback = async (e, responder) => {
  const response = await Promise.resolve(responder).catch(() => undefined);
  if (response) return response;
  if (e.request.mode === 'navigate') {
    const shell = await caches.match('/') || await caches.match('/index.html');
    if (shell) return shell;
  }
  return Response.error();
};

// Stashes files POSTed via the OS share sheet into Cache Storage, keyed under
// SHARE_TARGET_PREFIX, so the page we redirect to can pick them up.
const handleShareTarget = async (request) => {
  const formData = await request.formData();
  const files = formData.getAll('gpx').filter(f => f instanceof File && f.name);

  const cache = await caches.open(SHARE_TARGET_CACHE);
  await Promise.all(files.map((file, i) => cache.put(
    `${SHARE_TARGET_PREFIX}${i}`,
    new Response(file, { headers: { 'X-File-Name': encodeURIComponent(file.name) } })
  )));
};

self.addEventListener('fetch', function (e) {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname === '/share-target/') {
    e.respondWith(Response.redirect('/?share-target=gpx', 303));
    e.waitUntil(handleShareTarget(e.request));
    return;
  }

  for (const rule in rules) {
    const regex = new RegExp(rule);
    if (regex.test(e.request.url)) {
      e.respondWith(withFallback(e, rules[rule](e)));
      break;
    }
  }
});
