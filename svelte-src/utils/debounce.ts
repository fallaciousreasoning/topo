export const debounce = (func: () => void, time: number) => {
  let timeout;

  return () => {
    if (timeout)
      clearTimeout(timeout);

    timeout = setTimeout(() => func(), time);
  }
}