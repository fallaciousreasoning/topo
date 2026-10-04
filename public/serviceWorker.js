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
  '/index.html',
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

const downloadFirstRunAssets = async () => {
  const cache = await caches.open(CACHE_NAME);
  // Added individually rather than via cache.addAll, which is all-or-nothing: a single missing
  // entry (e.g. '/build/main.js', which no longer exists since the move to Vite's hashed
  // assets) silently meant nothing at all got precached.
  const results = await Promise.allSettled(FIRST_RUN_ASSETS.map(url => cache.add(url)));
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.warn('[ServiceWorker] Failed to precache', FIRST_RUN_ASSETS[i], r.reason);
  });
};

self.addEventListener('install', function (e) {
  console.log('[ServiceWorker] Install');
  e.waitUntil(downloadFirstRunAssets()
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', function (e) {
  console.log('[ServiceWorker] Activate');
  return self.clients.claim();
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

const networkThenCache = async e => {
  return fetch(e.request)
    .then(r => cache(e.request, r))
    .catch(() => caches.match(e.request));
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
      const responder = rules[rule](e);
      e.respondWith(responder);
      break;
    }
  }
});
