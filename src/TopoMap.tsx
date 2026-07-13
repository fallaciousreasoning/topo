import "maplibre-gl/dist/maplibre-gl.css";
import * as React from "react";
import "./caches/cachingProtocol";
import LayersControl from "./controls/LayersControl";
import MenuControl from "./controls/MenuControl";
import PositionSyncer from "./controls/PositionSyncer";
import SearchControl from "./controls/SearchControl";
import MeasureControl from "./controls/MeasureControl";
import { baseLayers, overlays } from "./layers/layerDefinition";
import linzVector from "./layers/linzVector";
import { createTopoRasterSources, hillshadeBlendSetting } from "./layers/topoRaster";
import Terrain from "./layers/terrain";
import Layer from "./map/Layer";
import Map, { useMap } from "./map/Map";
import Source from "./map/Source";
import { useParams } from "./routing/router";
import { addListener, getLayerSetting, removeListener } from "./utils/settings";
import { RasterTileSource } from "maplibre-gl";
import MenuSection from "./sections/MenuSection";
import MountainsSection from "./sections/MountainsSection";
import SearchSection from "./sections/SearchSection";
import SettingsSection from "./sections/SettingsSection";
import MapLabel from "./components/MapLabel";
import SelectedShapeHighlight from "./components/SelectedShapeHighlight";
import MapCursor from "./components/MapCursor";
import StatusBar from "./controls/StatusBar";
import LocationSection from "./sections/LocationSection";
import LongPressLookup from "./controls/LongPressLookup";
import DownloadAreaControl from "./controls/DownloadAreaControl";
import ResumeDownloads from "./controls/ResumeDownloads";
import { BaseLayerDefinition } from "./layers/config";
import Drawing from "./draw/Drawing";
import TracksSection from "./sections/TracksSection";
import TrackSection from "./sections/TrackSection";
import PointsSection from "./sections/PointsSection";
import PointSection from "./sections/PointSection";
import DownloadsSection from "./sections/DownloadsSection";
import Mountains from "./layers/mountains";
import SectionContainer from "./sections/SectionContainer";
import { HILLSHADE_FLOOR_ID, CONTOUR_FLOOR_ID, OVERLAY_FLOOR_ID } from "./map/overlayFloor";

const initialTopoBlend = getLayerSetting('topo-raster', 'hillshadeBlend', hillshadeBlendSetting.default)
const sources = baseLayers.flatMap((b) => {
  const sourcesSpec = b.id === 'topo-raster' ? createTopoRasterSources(initialTopoBlend) : b.sources
  return Object.entries(sourcesSpec).map(([key, spec]) => (
    <Source key={key} id={key} spec={spec as any} />
  ))
});

function TopoRasterBlendSync() {
  const { map } = useMap()

  React.useEffect(() => {
    const applyBlend = () => {
      const blend = getLayerSetting('topo-raster', 'hillshadeBlend', hillshadeBlendSetting.default)
      const topoSources = createTopoRasterSources(blend)
      try {
        ;(map.getSource('topo50') as RasterTileSource | undefined)?.setTiles(topoSources.topo50.tiles)
        ;(map.getSource('topo250') as RasterTileSource | undefined)?.setTiles(topoSources.topo250.tiles)
      } catch {
      }
    }

    const listener = (key: string) => {
      if (key === 'layerSettings') applyBlend()
    }

    addListener(listener)
    return () => {
      removeListener(listener)
    }
  }, [map])

  return null
}
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
      {/* Permanent, invisible markers sitting right above the base map, fixing
          three stacking slots below every other overlay - bottom to top:
          hillshade, then contours (drawn over the hillshade so shading never
          dulls the contour lines), then everything else. Overlays that just
          want to render on top of whatever's already there can keep using a
          plain addLayer() (no beforeId); one that needs a fixed slot passes
          the anchor immediately above that slot as its beforeId - see
          overlayFloor.ts, hillshade.tsx and contours.tsx. This holds no
          matter what order overlays were toggled on in. */}
      <Layer
        layer={{
          id: HILLSHADE_FLOOR_ID,
          type: "background",
          layout: { visibility: "none" },
          paint: {},
        }}
      />
      <Layer
        layer={{
          id: CONTOUR_FLOOR_ID,
          type: "background",
          layout: { visibility: "none" },
          paint: {},
        }}
      />
      <Layer
        layer={{
          id: OVERLAY_FLOOR_ID,
          type: "background",
          layout: { visibility: "none" },
          paint: {},
        }}
      />
      {overlays
        .filter((e) => routeParams.overlays.includes(e.id))
        .map((o) =>
          typeof o.source === "function" ? (
            <React.Fragment key={o.id}>
              <o.source />
            </React.Fragment>
          ) : (
            <React.Fragment key={o.id}>
              {o.source}
            </React.Fragment>
          ),
        )}
    </>
  );
}

export default function TopoMap() {
  return (
    <Map>
      <SectionContainer>
        <MenuSection />
        <SearchSection />
        <MountainsSection />
        <SettingsSection />
        <TracksSection />
        <TrackSection />
        <PointsSection />
        <PointSection />
        <LocationSection />
        <DownloadsSection />
      </SectionContainer>

      <PositionSyncer />
      <LayersControl />
      <MenuControl />
      <SearchControl />
      <MeasureControl />
      <DownloadAreaControl />
      <ResumeDownloads />
      <StatusBar />

      <MapCursor />
      <LongPressLookup />

      {sources}
      <TopoRasterBlendSync />
      <Layers />
      <SelectedShapeHighlight />
      <MapLabel />
      <Drawing />
    </Map>
  );
}
