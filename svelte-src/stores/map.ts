import { Extent } from "ol/extent";
import { writable } from "svelte/store";

export const extent = writable<Extent>([0,0,0,0]);
