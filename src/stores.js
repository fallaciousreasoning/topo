import { writable } from 'svelte/store';

// Global progress indicator.
export const progress = writable(0);

// Whether or not the app drawer should be shown.
export const drawerOpen = writable(false);