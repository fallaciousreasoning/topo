<script lang="ts">
  import { debounce } from "./utils/debounce";
  import type { Map, View } from "ol";
  import { fromLonLat, toLonLat } from "ol/proj";
  import round from "./utils/round";
  import { getOlContext } from "./ol/Map.svelte";
  import { onMount, tick } from "svelte";
  import onMountTick from "./utils/onMountTick";

  const { getMap } = getOlContext();
  let map: Map;
  onMountTick(() => (map = getMap()));

  const localStorageKey = "mapPosition";

  const updateView = (
    view: View,
    position: { lat: number; lng: number; zoom: number; rotation: number }
  ) => {
    view.setCenter(fromLonLat([position.lng, position.lat]));
    view.setZoom(position.zoom);
    view.setRotation(isNaN(position.rotation) ? 0 : position.rotation);
  };

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

    if (isNaN(position.lat) || isNaN(position.lng) || isNaN(position.zoom) || isNaN(position.rotation)) {
      return;
    }

    updateView(map.getView(), position);
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

    updateView(map.getView(), newPosition);
  });

  $: {
    if (map) {
      map.on("moveend", debounced);
      map.on("zoom", debounced);
      restorePosition();
    }
  }
</script>
