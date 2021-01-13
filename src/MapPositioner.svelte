<script lang="ts">
  import { debounce } from "./utils/debounce";
  import type { View } from "ol";
  import { fromLonLat, toLonLat } from "ol/proj";
  import round from "./utils/round";
  import { getOlContext } from "./ol/Map.svelte";
  import { onMount } from "svelte";
  import fragment from "./stores/fragment";
  import { onlyTruthy } from "./utils/assign";

  const { map } = getOlContext();
  const localStorageKey = "mapPosition";

  const updateView = (
    view: View,
    position: { lat: number; lng: number; zoom: number; rotation: number }
  ) => {
    if (!isNaN(position.lat) && !isNaN(position.lng)) {
      view.setCenter(fromLonLat([position.lng, position.lat]));
    }
    if (!isNaN(position.zoom)) view.setZoom(position.zoom);
    if (!isNaN(position.rotation))
      view.setRotation(isNaN(position.rotation) ? 0 : position.rotation);
  };

  const getMapPosition = () => {
    const view = map.getView();
    const centre = toLonLat(view.getCenter() || []);
    return {
      lat: round(centre[1], 5),
      lng: round(centre[0], 5),
      zoom: view.getZoom(),
      rotation: view.getRotation(),
    };
  };

  const savePosition = () => {
    const position = getMapPosition();
    localStorage.setItem(localStorageKey, JSON.stringify(position));
    $fragment.position = position;
  };

  const positionFromLocalStorage = () => {
    const positionJSON = localStorage.getItem(localStorageKey);
    if (!positionJSON) return;
    return JSON.parse(positionJSON);
  };

  const restorePosition = () => {
    const localPosition = positionFromLocalStorage();
    // Prefer position from fragment string.
    const position = { ...localPosition, ...onlyTruthy($fragment.position) };
    updateView(map.getView(), position);
  };

  const debouncedSavePosition = debounce(savePosition, 500);
  map.on("moveend", debouncedSavePosition);
  map.on("zoom", debouncedSavePosition);

  $: {
    const oldPosition = getMapPosition();
    const newPosition = { ...oldPosition, ...onlyTruthy($fragment.position) };

    if (
      oldPosition.lat !== newPosition.lat ||
      oldPosition.lng !== newPosition.lng ||
      oldPosition.zoom !== newPosition.zoom
    ) {
      updateView(map.getView(), newPosition);
    }
  }

  onMount(restorePosition);
</script>
