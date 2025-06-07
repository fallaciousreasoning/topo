export const debounce = <T extends unknown[]>(
  func: (...args: T) => void,
  delay: number,
) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: T) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};
