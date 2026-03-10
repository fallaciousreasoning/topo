type Coord = [number, number];

interface PendingRequest {
  resolve: (coords: Coord[] | null) => void;
  reject: (err: Error) => void;
}

interface QueuedMessage {
  msg: { type: 'ROUTE'; id: number; fromLng: number; fromLat: number; toLng: number; toLat: number };
  resolve: (coords: Coord[] | null) => void;
  reject: (err: Error) => void;
}

export class RoutingManager {
  #worker: Worker;
  #ready = false;
  #queue: QueuedMessage[] = [];
  #pending = new Map<number, PendingRequest>();
  #dedup = new Map<string, Promise<Coord[] | null>>();
  #nextId = 0;

  constructor() {
    this.#worker = new Worker(new URL('./routingWorker.ts', import.meta.url), { type: 'module' });
    this.#worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'READY') {
        this.#ready = true;
        const queued = this.#queue.splice(0);
        for (const { msg: queuedMsg, resolve, reject } of queued) {
          this.#sendRoute(queuedMsg, resolve, reject);
        }
      } else if (msg.type === 'ROUTE_RESULT') {
        const req = this.#pending.get(msg.id);
        if (req) {
          this.#pending.delete(msg.id);
          req.resolve(msg.coordinates);
        }
      }
    };
    this.#worker.onerror = (e) => {
      console.error('Routing worker error:', e);
    };
  }

  route(from: Coord, to: Coord): Promise<Coord[] | null> {
    const key = `${from[0]},${from[1]}->${to[0]},${to[1]}`;
    const existing = this.#dedup.get(key);
    if (existing) return existing;

    const id = this.#nextId++;
    const promise = new Promise<Coord[] | null>((resolve, reject) => {
      const msg = { type: 'ROUTE' as const, id, fromLng: from[0], fromLat: from[1], toLng: to[0], toLat: to[1] };
      if (this.#ready) {
        this.#sendRoute(msg, resolve, reject);
      } else {
        this.#queue.push({ msg, resolve, reject });
      }
    });

    this.#dedup.set(key, promise);
    promise.finally(() => this.#dedup.delete(key));
    return promise;
  }

  #sendRoute(
    msg: QueuedMessage['msg'],
    resolve: (coords: Coord[] | null) => void,
    reject: (err: Error) => void,
  ) {
    this.#pending.set(msg.id, { resolve, reject });
    this.#worker.postMessage(msg);
  }

  destroy() {
    this.#worker.terminate();
  }
}
