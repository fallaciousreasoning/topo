<script>
  import { debounce } from "./utils/debounce";

  export let map;

  const localStorageKey = "mapPosition";

  const savePosition = () => {
    const position = {
      ...map.getCenter(),
      zoom: map.getZoom()
    };

    localStorage.setItem(localStorageKey, JSON.stringify(position));

    const queryParams = new URLSearchParams(location.hash.substr(1));
    for (const key in position) {
      queryParams.set(key, position[key]);
    }

    history.replaceState(null, "", `#${queryParams.toString()}`);
  };

  const positionFromFragment = () => {
    const queryParams = new URLSearchParams(location.hash.substr(1));
    const position = {};

    for (const [key, value] of queryParams) {
      position[key] = value;
    }

    return position;
  };

  const positionFromLocalStorage = () => {
    const positionJSON = localStorage.getItem(localStorageKey);
    if (!positionJSON) return;

    return JSON.parse(positionJSON);
  };

  const restorePosition = () => {
    const fragmentPosition = positionFromFragment();
    const localPosition = positionFromLocalStorage();

    // Prefer position from fragment string.
    const position = { ...localPosition, ...fragmentPosition };

    if (isNaN(position.lat) || isNaN(position.lng) || isNaN(position.zoom)) {
      return;
    }

    map.setView(position, position.zoom);
  };

  const debounced = debounce(savePosition, 500);

  window.addEventListener("hashchange", () => {
    if (!map) return;

    const oldPosition = { ...map.getCenter(), zoom: map.getZoom() };
    const newPosition = { ...oldPosition, ...positionFromFragment() };

    if (
      oldPosition.lat === newPosition.lat &&
      oldPosition.lng === newPosition.lng &&
      oldPosition.zoom === newPosition.zoom
    ) {
      return;
    }

    map.setView(newPosition, newPosition.zoom);
  });

  $: {
    if (map) {
      map.on("moveend", debounced);
      map.on("zoom", debounced);
      restorePosition();
    }
  }
</script>
