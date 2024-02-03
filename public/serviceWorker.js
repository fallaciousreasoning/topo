const CACHE_VERSION = 1;
const CACHE_NAME = `nz-topo-cache-v${CACHE_VERSION}`;

// Decide whether we should try and save data.
const shouldConserveData = () => {
  const connection = navigator.connection;
  if (!connection)
    return false;

  if (connection.saveData)
    return true;

  return connection.type === "cellular";
};

// Download assets necessary to work offline.
const downloadFirstRunAssets = async () => {
  const cache = await caches.open(CACHE_NAME);
  cache.addAll([
    '/index.html',
    '/favicon.png',
    '/favicon.svg',
    '/global.css',
    '/build/extra.css',
    '/build/tailwind.css',
    '/build/main.js',
    '/data/huts.json',
    '/icons/marker.svg',
    '/icons/location-indicator.svg',
  ]);
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
  // First party scripts should be fetched from the network, if possible. 
  [self.registration.scope]: networkThenCache,

  // Fetch latest mountain data, if we have a network connection.
  "https://raw.githubusercontent.com/fallaciousreasoning/nz-mountains/main/mountains.json": networkThenCache,

  // Use search data from cache.
  'https://search.topos.nz/data/min_excluded_places.json': cacheThenNetwork
}

self.addEventListener('fetch', function (e) {
  for (const rule in rules) {
    const regex = new RegExp(rule);
    if (regex.test(e.request.url)) {
      const responder = rules[rule](e);
      e.respondWith(responder);
      break;
    }
  }
});
