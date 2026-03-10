import { loadCompactBuffer, CompactGraph } from './compactGraph';

const GRAPH_URL = 'https://pub-36de1a8a322545b9bd6ef274d5f46c7c.r2.dev/tracks.tg';
const CACHE_NAME = 'track-graph-v1';

// NZTM2000 parameters (GRS80, CM=173°E, FE=1600000, FN=10000000, k0=0.9996)
const TM_A = 6378137.0;
const TM_F = 1 / 298.257222101;
const TM_K0 = 0.9996;
const TM_E0 = 1600000;
const TM_N0 = 10000000;
const TM_LON0 = 173 * Math.PI / 180;
const TM_E2 = 2 * TM_F - TM_F * TM_F;
const TM_E4 = TM_E2 * TM_E2;
const TM_E6 = TM_E4 * TM_E2;
const TM_EP2 = TM_E2 / (1 - TM_E2); // e'^2

/** Convert WGS84 lat/lng (degrees) to NZTM2000 [Easting, Northing] (metres). */
function toNZTM(lat: number, lng: number): [number, number] {
  const phi = lat * Math.PI / 180;
  const lam = lng * Math.PI / 180 - TM_LON0;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const tanPhi = sinPhi / cosPhi;
  const T = tanPhi * tanPhi;
  const C = TM_EP2 * cosPhi * cosPhi;
  const nu = TM_A / Math.sqrt(1 - TM_E2 * sinPhi * sinPhi);
  const M = TM_A * (
    (1 - TM_E2 / 4 - 3 * TM_E4 / 64 - 5 * TM_E6 / 256) * phi
    - (3 * TM_E2 / 8 + 3 * TM_E4 / 32 + 45 * TM_E6 / 1024) * Math.sin(2 * phi)
    + (15 * TM_E4 / 256 + 45 * TM_E6 / 1024) * Math.sin(4 * phi)
    - (35 * TM_E6 / 3072) * Math.sin(6 * phi)
  );
  const A = lam * cosPhi;
  const x = TM_K0 * nu * (
    A
    + (1 - T + C) * A ** 3 / 6
    + (5 - 18 * T + T * T + 72 * C - 58 * TM_EP2) * A ** 5 / 120
  );
  const y = TM_K0 * (
    M + nu * tanPhi * (
      A * A / 2
      + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24
      + (61 - 58 * T + T * T + 600 * C - 330 * TM_EP2) * A ** 6 / 720
    )
  );
  return [TM_E0 + x, TM_N0 + y];
}

/** Convert NZTM2000 [Easting, Northing] (metres) to WGS84 [lng, lat] (degrees). */
function fromNZTM(E: number, N: number): [number, number] {
  const M1 = (N - TM_N0) / TM_K0;
  const e1 = (1 - Math.sqrt(1 - TM_E2)) / (1 + Math.sqrt(1 - TM_E2));
  const mu = M1 / (TM_A * (1 - TM_E2 / 4 - 3 * TM_E4 / 64 - 5 * TM_E6 / 256));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = sinPhi1 / cosPhi1;
  const T1 = tanPhi1 * tanPhi1;
  const C1 = TM_EP2 * cosPhi1 * cosPhi1;
  const nu1 = TM_A / Math.sqrt(1 - TM_E2 * sinPhi1 * sinPhi1);
  const rho1 = TM_A * (1 - TM_E2) / Math.pow(1 - TM_E2 * sinPhi1 * sinPhi1, 1.5);
  const D = (E - TM_E0) / (nu1 * TM_K0);
  const lat = phi1 - (nu1 * tanPhi1 / rho1) * (
    D * D / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * TM_EP2) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * TM_EP2 - 3 * C1 * C1) * D ** 6 / 720
  );
  const lon = TM_LON0 + (
    D
    - (1 + 2 * T1 + C1) * D ** 3 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * TM_EP2 + 24 * T1 * T1) * D ** 5 / 120
  ) / cosPhi1;
  return [lon * 180 / Math.PI, lat * 180 / Math.PI];
}

let graph: CompactGraph | null = null;

async function loadGraph() {
  const cache = await caches.open(CACHE_NAME);
  let response = await cache.match(GRAPH_URL);
  if (!response) {
    response = await fetch(GRAPH_URL);
    if (!response.ok) throw new Error(`Failed to fetch graph: ${response.status}`);
    await cache.put(GRAPH_URL, response.clone());
  }
  const buffer = await response.arrayBuffer();
  graph = loadCompactBuffer(buffer);
  self.postMessage({ type: 'READY' });
}

loadGraph().catch(err => console.error('Failed to load routing graph:', err));

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type !== 'ROUTE') return;

  const { id, fromLng, fromLat, toLng, toLat } = msg;

  if (!graph) {
    self.postMessage({ type: 'ROUTE_RESULT', id, coordinates: null });
    return;
  }

  const [fromX, fromY] = toNZTM(fromLat, fromLng);
  const [toX, toY] = toNZTM(toLat, toLng);

  const startId = graph.nearestNode(fromX, fromY);
  const endId = graph.nearestNode(toX, toY);

  if (startId === null || endId === null) {
    self.postMessage({ type: 'ROUTE_RESULT', id, coordinates: null });
    return;
  }

  const result = graph.shortestPath(startId, endId);
  if (!result) {
    self.postMessage({ type: 'ROUTE_RESULT', id, coordinates: null });
    return;
  }

  const [nodeIds] = result;
  const coordinates: [number, number][] = nodeIds.map(nodeId => {
    const [x, y] = graph!.nodeCoords(nodeId);
    return fromNZTM(x, y);
  });

  self.postMessage({ type: 'ROUTE_RESULT', id, coordinates });
};
