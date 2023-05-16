import { tick } from "svelte"

export const scrollTo = (element: HTMLUnknownElement, scrollTo: boolean) => {
    if (!scrollTo) return;

    tick().then(() => setTimeout(() => element?.scrollIntoView()));
}
