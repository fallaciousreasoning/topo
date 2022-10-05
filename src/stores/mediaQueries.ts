import { writable } from "svelte/store";

export const isMobileQuery = 'screen and (max-width: 448px)';
export const isSmallScreenQuery = 'screen and (max-width: 768px)';

const createMediaQueryStore = (query: string) => {
    const mq = window.matchMedia(query);
    const store = writable(mq.matches);
    mq.addEventListener('change', ev => {
        store.set(mq.matches);
    })
    return store;
}

export const isMobile = createMediaQueryStore(isMobileQuery);
export const isSmallScreen = createMediaQueryStore(isSmallScreenQuery)
