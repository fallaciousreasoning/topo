import { onMount, tick, onDestroy } from "svelte"

export default (func: () => any | void) => {
    let promise;

    onMount(() => {
        promise = tick().then(() => func());
    });

    onDestroy(async () => {
        const result = await promise;
        if (typeof result === 'function')
            result();
    });
}