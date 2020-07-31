<script lang="ts">
  import { debounce } from "./utils/debounce";
  import { Map, View } from "ol";
  import { fromLonLat, toLonLat } from "ol/proj";
  import round from './utils/round';

  export let map: Map;

  const localStorageKey = "mapPosition";

  const positionToView = (position: { lat: number, lng: number, zoom: number, rotation: number}) => {
    return new View({
      center: fromLonLat([position.lng, position.lat]),
      zoom: isNaN(position.zoom) ? 11 : position.zoom,
      rotation: isNaN(position.rotation) ? 0 : position.rotation
    })
  }

  const savePosition = () => {
    const view = map.getView();
    const centre = toLonLat(view.getCenter());
    const position = {
      lat: round(centre[1], 5),
      lng: round(centre[0], 5),
      zoom: view.getZoom(),
      rotation: view.getRotation(),
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

    map.setView(positionToView(position));
  };

  const debounced = debounce(savePosition, 500);

  window.addEventListener("hashchange", () => {
    if (!map) return;

    const view = map.getView();
    const center = toLonLat(view.getCenter());
    const oldPosition = {
      lat: round(center[1], 5),
      lng: round(center[0], 5),
      zoom: view.getZoom(),
      rotation: view.getRotation(),
    };

    const newPosition = { ...oldPosition, ...positionFromFragment() };

    if (
      oldPosition.lat === newPosition.lat &&
      oldPosition.lng === newPosition.lng &&
      oldPosition.zoom === newPosition.zoom
    ) {
      return;
    }

    map.setView(positionToView(newPosition));
  });

  $: {
    if (map) {
      map.on("moveend", debounced);
      map.on("zoom", debounced);
      restorePosition();
    }
  }
</script>
