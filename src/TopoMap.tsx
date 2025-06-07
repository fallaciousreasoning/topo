import "maplibre-gl/dist/maplibre-gl.css";
import * as React from "react";
import "./caches/cachingProtocol";
import LayersControl from "./controls/LayersControl";
import MenuControl from "./controls/MenuControl";
import PositionSyncer from "./controls/PositionSyncer";
import SearchControl from "./controls/SearchControl";
import { baseLayers, overlays } from "./layers/layerDefinition";
import linzVector from "./layers/linzVector";
import Terrain from "./layers/terrain";
import Layer from "./map/Layer";
import Map, { useMap } from "./map/Map";
import Source from "./map/Source";
import { useParams } from "./routing/router";
import MenuSection from "./sections/MenuSection";
import MountainSection from "./sections/MountainSection";
import MountainsSection from "./sections/MountainsSection";
import SearchSection from "./sections/SearchSection";
import SettingsSection from "./sections/SettingsSection";
import MapLabel from "./components/MapLabel";
import LongPressLookup from "./controls/LongPressLookup";
import { BaseLayerDefinition } from "./layers/config";
import TrackLayer from "./draw/TrackLayer";
import Drawing from "./draw/Drawing";
import TracksSection from "./sections/TracksSection";
import Mountains from "./layers/mountains";

const sources = baseLayers.flatMap((b) =>
  Object.entries(b.sources).map(([key, spec]) => (
    <Source key={key} id={key} spec={spec as any} />
  )),
);
const terrain = {
  source: "terrainSource",
  exaggeration: 1,
};

let lastbaseMap: BaseLayerDefinition | null;
function Layers() {
  const routeParams = useParams();
  const { map } = useMap();
  const basemap =
    baseLayers.find((r) => r.id === routeParams.basemap) ?? linzVector;
  const layers = React.useMemo(() => {
    // Make sure we sort the base map as the bottom layer (under everything else)
    const beforeId = map.getLayersOrder()[lastbaseMap?.layers.length ?? 0];
    lastbaseMap = basemap;
    return basemap.layers.map((l) => (
      <Layer key={l.id} layer={l as any} beforeId={beforeId} />
    ));
  }, [basemap]);

  // Swap to/from 3d mode when the view changes
  React.useEffect(() => {
    const t = routeParams.pitch === 0 ? null : terrain;
    if (map?.getTerrain() !== t) {
      map.on("idle", () => {
        map?.setTerrain(t);
      });
    }
  }, [routeParams.pitch]);

  return (
    <>
      <Terrain />
      {layers}
      {overlays
        .filter((e) => routeParams.overlays.includes(e.id))
        .map((o) =>
          typeof o.source === "function" ? <o.source key={o.id} /> : o.source,
        )}
    </>
  );
}

export default function TopoMap() {
  return (
    <Map>
      <SearchSection />
      <MountainsSection />
      <MountainSection />
      <SettingsSection />
      <TracksSection />

      <PositionSyncer />
      <MenuSection />
      <LayersControl />
      <MenuControl />
      <SearchControl />

      <MapLabel />
      <LongPressLookup />

      {sources}
      <Layers />
      <Drawing />
    </Map>
  );
}
