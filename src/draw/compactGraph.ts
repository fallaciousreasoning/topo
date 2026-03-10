/**
 * TypeScript parser for the track-graph compact binary format (.tg).
 *
 * Format (little-endian):
 *   - Magic: 4 bytes "TG01"
 *   - Header: reserved (4), N nodes (4), M edges (4)
 *   - Nodes: N × (x float32, y float32) = 8*N bytes
 *   - Edges: M × (u uint32, v uint32, length float32) = 12*M bytes
 *
 * Compressed .tg.zst is not parsed here; decompress to .tg first or use a zstd library.
 */

const MAGIC = new Uint8Array([0x54, 0x47, 0x30, 0x31]); // "TG01"
const HEADER_SIZE = 4 + 4 + 4 + 4; // magic + reserved + N + M
const NODE_SIZE = 4 + 4; // x float32, y float32
const EDGE_SIZE = 4 + 4 + 4; // u uint32, v uint32, length float32

const DEFAULT_GRID_CELL_M = 500;
const MAX_GRID_CELLS = 50_000_000;

/** Min-heap for A*: entries [f, g, nodeId] where f = g + h */
class MinHeap {
  private heap: [number, number, number][] = [];

  push(f: number, g: number, nodeId: number): void {
    this.heap.push([f, g, nodeId]);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): [number, number, number] | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p][0] <= this.heap[i][0]) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }

  private bubbleDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < n && this.heap[left][0] < this.heap[smallest][0]) smallest = left;
      if (right < n && this.heap[right][0] < this.heap[smallest][0]) smallest = right;
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}

export interface CompactGraphData {
  nodes: Float32Array;
  edgeOffsets: Uint32Array;
  edgeTargets: Uint32Array;
  edgeWeights: Float32Array;
  gridCellM: number;
  gridMinX: number;
  gridMinY: number;
  gridNx: number;
  gridNy: number;
  gridOffsets: Uint32Array;
  gridNodeIds: Uint32Array;
}

export class CompactGraph {
  readonly nodes: Float32Array;
  readonly edgeOffsets: Uint32Array;
  readonly edgeTargets: Uint32Array;
  readonly edgeWeights: Float32Array;
  readonly gridCellM: number;
  readonly gridMinX: number;
  readonly gridMinY: number;
  readonly gridNx: number;
  readonly gridNy: number;
  readonly gridOffsets: Uint32Array;
  readonly gridNodeIds: Uint32Array;

  constructor(data: CompactGraphData) {
    this.nodes = data.nodes;
    this.edgeOffsets = data.edgeOffsets;
    this.edgeTargets = data.edgeTargets;
    this.edgeWeights = data.edgeWeights;
    this.gridCellM = data.gridCellM;
    this.gridMinX = data.gridMinX;
    this.gridMinY = data.gridMinY;
    this.gridNx = data.gridNx;
    this.gridNy = data.gridNy;
    this.gridOffsets = data.gridOffsets;
    this.gridNodeIds = data.gridNodeIds;
  }

  get numNodes(): number {
    return this.nodes.length >> 1;
  }

  private cellIndex(x: number, y: number): [number, number] | null {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const dx = (x - this.gridMinX) / this.gridCellM;
    const dy = (y - this.gridMinY) / this.gridCellM;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
    const ix = Math.max(0, Math.min(Math.floor(dx), this.gridNx - 1));
    const iy = Math.max(0, Math.min(Math.floor(dy), this.gridNy - 1));
    return [ix, iy];
  }

  private cellAt(x: number, y: number): [number, number] {
    const c = this.cellIndex(x, y);
    return c ?? [0, 0];
  }

  /** Returns node id of the node closest to (x, y), or null if graph is empty. */
  nearestNode(x: number, y: number): number | null {
    const n = this.numNodes;
    if (n === 0) return null;
    const [ix, iy] = this.cellAt(x, y);
    let bestId: number | null = null;
    let bestD2 = Infinity;
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const ci = ix + di;
        const cj = iy + dj;
        if (ci >= 0 && ci < this.gridNx && cj >= 0 && cj < this.gridNy) {
          const c = ci * this.gridNy + cj;
          const start = this.gridOffsets[c];
          const end = this.gridOffsets[c + 1];
          for (let k = start; k < end; k++) {
            const i = this.gridNodeIds[k];
            const nx = this.nodes[i * 2];
            const ny = this.nodes[i * 2 + 1];
            const dx = nx - x;
            const dy = ny - y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) {
              bestD2 = d2;
              bestId = i;
            }
          }
        }
      }
    }
    if (bestId !== null) return bestId;
    // Fallback: brute force (e.g. point outside grid)
    for (let i = 0; i < n; i++) {
      const nx = this.nodes[i * 2];
      const ny = this.nodes[i * 2 + 1];
      if (!Number.isFinite(nx) || !Number.isFinite(ny)) continue;
      const dx = nx - x;
      const dy = ny - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestId = i;
      }
    }
    return bestId;
  }

  private heuristic(nodeId: number, endId: number): number {
    const ax = this.nodes[nodeId * 2];
    const ay = this.nodes[nodeId * 2 + 1];
    const bx = this.nodes[endId * 2];
    const by = this.nodes[endId * 2 + 1];
    return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  }

  /** A* shortest path. Returns [nodeIds, totalLength] or null if no path. */
  shortestPath(startId: number, endId: number): [number[], number] | null {
    const n = this.numNodes;
    if (startId < 0 || startId >= n || endId < 0 || endId >= n) return null;
    const dist = new Float64Array(n);
    dist.fill(Infinity);
    dist[startId] = 0;
    const prev: (number | null)[] = new Array(n);
    prev.fill(null);
    const heap = new MinHeap();
    const h0 = this.heuristic(startId, endId);
    heap.push(h0, 0, startId);
    while (true) {
      const entry = heap.pop();
      if (!entry) return null;
      const [, g, u] = entry;
      if (g > dist[u]) continue;
      if (u === endId) {
        const path: number[] = [];
        let cur: number | null = endId;
        while (cur !== null) {
          path.push(cur);
          cur = prev[cur];
        }
        path.reverse();
        return [path, dist[endId]];
      }
      const o = this.edgeOffsets;
      const t = this.edgeTargets;
      const w = this.edgeWeights;
      for (let j = o[u]; j < o[u + 1]; j++) {
        const v = t[j];
        const wj = w[j];
        const altG = dist[u] + wj;
        if (altG < dist[v]) {
          dist[v] = altG;
          prev[v] = u;
          const hv = this.heuristic(v, endId);
          heap.push(altG + hv, altG, v);
        }
      }
    }
  }

  nodeCoords(i: number): [number, number] {
    return [this.nodes[i * 2], this.nodes[i * 2 + 1]];
  }
}

function parseCompactBuffer(buf: ArrayBuffer): CompactGraphData {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  if (bytes.length < HEADER_SIZE) throw new Error("Compact graph: buffer too short");
  for (let i = 0; i < 4; i++) {
    if (bytes[i] !== MAGIC[i]) throw new Error("Compact graph: bad magic (not a .tg file)");
  }
  view.getUint32(4, true); // reserved
  const N = view.getUint32(8, true);
  const M = view.getUint32(12, true);

  let pos = HEADER_SIZE;
  const nodeBytesAvailable = buf.byteLength - pos;
  const N_actual = Math.min(N, Math.floor(nodeBytesAvailable / NODE_SIZE));

  const nodes = new Float32Array(N_actual * 2);
  for (let i = 0; i < N_actual; i++) {
    nodes[i * 2] = view.getFloat32(pos, true);
    nodes[i * 2 + 1] = view.getFloat32(pos + 4, true);
    pos += NODE_SIZE;
  }

  const edgeBytesRemaining = buf.byteLength - pos;
  const numEdges = Math.min(M, Math.floor(edgeBytesRemaining / EDGE_SIZE));

  const degree = new Uint32Array(N_actual);
  let edgeReadPos = pos;
  for (let e = 0; e < numEdges; e++) {
    const u = view.getUint32(edgeReadPos, true);
    const v = view.getUint32(edgeReadPos + 4, true);
    edgeReadPos += EDGE_SIZE;
    if (u < N_actual && v < N_actual) degree[u]++;
  }

  const edgeOffsets = new Uint32Array(N_actual + 1);
  for (let i = 1; i <= N_actual; i++) {
    edgeOffsets[i] = edgeOffsets[i - 1] + degree[i - 1];
  }
  const totalEdges = edgeOffsets[N_actual];
  const edgeTargets = new Uint32Array(totalEdges);
  const edgeWeights = new Float32Array(totalEdges);
  const nextSlot = new Uint32Array(edgeOffsets);

  edgeReadPos = pos;
  for (let e = 0; e < numEdges; e++) {
    const u = view.getUint32(edgeReadPos, true);
    const v = view.getUint32(edgeReadPos + 4, true);
    const w = view.getFloat32(edgeReadPos + 8, true);
    edgeReadPos += EDGE_SIZE;
    if (u < N_actual && v < N_actual) {
      const s = nextSlot[u];
      edgeTargets[s] = v;
      edgeWeights[s] = w;
      nextSlot[u]++;
    }
  }

  let gridMinX = Infinity;
  let gridMinY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < N_actual; i++) {
    const x = nodes[i * 2];
    const y = nodes[i * 2 + 1];
    if (Number.isFinite(x) && Number.isFinite(y)) {
      if (x < gridMinX) gridMinX = x;
      if (y < gridMinY) gridMinY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(gridMinX) || !Number.isFinite(gridMinY)) {
    gridMinX = gridMinY = 0;
    maxX = maxY = DEFAULT_GRID_CELL_M;
  }
  let spanX = maxX - gridMinX;
  let spanY = maxY - gridMinY;
  if (!Number.isFinite(spanX) || !Number.isFinite(spanY) || spanX < 0 || spanY < 0) {
    spanX = spanY = DEFAULT_GRID_CELL_M;
  }
  let gridCellM = DEFAULT_GRID_CELL_M;
  if (spanX > 0 && spanY > 0) {
    const tentativeCells = Math.ceil(spanX / gridCellM) * Math.ceil(spanY / gridCellM);
    if (tentativeCells > MAX_GRID_CELLS) {
      gridCellM = Math.max(gridCellM, Math.sqrt((spanX * spanY) / MAX_GRID_CELLS));
    }
  }
  const gridNx = Math.max(1, Math.ceil(spanX / gridCellM));
  const gridNy = Math.max(1, Math.ceil(spanY / gridCellM));
  const numCells = gridNx * gridNy;

  const cellCount = new Uint32Array(numCells);
  for (let i = 0; i < N_actual; i++) {
    const x = nodes[i * 2];
    const y = nodes[i * 2 + 1];
    const dx = (x - gridMinX) / gridCellM;
    const dy = (y - gridMinY) / gridCellM;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) continue;
    const ix = Math.max(0, Math.min(Math.floor(dx), gridNx - 1));
    const iy = Math.max(0, Math.min(Math.floor(dy), gridNy - 1));
    cellCount[ix * gridNy + iy]++;
  }
  const gridOffsets = new Uint32Array(numCells + 1);
  for (let c = 1; c <= numCells; c++) {
    gridOffsets[c] = gridOffsets[c - 1] + cellCount[c - 1];
  }
  const totalInGrid = gridOffsets[numCells];
  const gridNodeIds = new Uint32Array(totalInGrid);
  const cellNext = new Uint32Array(gridOffsets);
  for (let i = 0; i < N_actual; i++) {
    const x = nodes[i * 2];
    const y = nodes[i * 2 + 1];
    const dx = (x - gridMinX) / gridCellM;
    const dy = (y - gridMinY) / gridCellM;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) continue;
    const ix = Math.max(0, Math.min(Math.floor(dx), gridNx - 1));
    const iy = Math.max(0, Math.min(Math.floor(dy), gridNy - 1));
    const c = ix * gridNy + iy;
    gridNodeIds[cellNext[c]] = i;
    cellNext[c]++;
  }

  return {
    nodes,
    edgeOffsets,
    edgeTargets,
    edgeWeights,
    gridCellM,
    gridMinX,
    gridMinY,
    gridNx,
    gridNy,
    gridOffsets,
    gridNodeIds,
  };
}

/**
 * Load a compact graph from an ArrayBuffer (uncompressed .tg format).
 * For .tg.zst, decompress first (e.g. with a zstd library) then pass the result.
 */
export function loadCompactBuffer(buffer: ArrayBuffer): CompactGraph {
  const data = parseCompactBuffer(buffer);
  return new CompactGraph(data);
}
