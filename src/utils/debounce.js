export const debounce = (func, time) => {
    let timeout;

    return () => {
        if (timeout)
          clearTimeout(timeout);

        timeout = setTimeout(() => func(), time);
    }
}