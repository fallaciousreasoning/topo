import { onMount, tick } from "svelte"

export default (func: () => any |void) => {
    onMount(async () => {
        await tick();
        return func();
    });
}