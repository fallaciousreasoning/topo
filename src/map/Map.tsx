import React, { useContext, useEffect } from "react";
import { Map, ScaleControl, StyleSpecification, GeolocateControl, NavigationControl } from "maplibre-gl";
import { useParams } from "../routing/router";
import linzVector from "../layers/linzVector";
import { baseLayers, getMapStyle, overlays } from "../layers/layerDefinition";
import { demSource, elevationEncoding, elevationScheme, maxContourZoom } from "../layers/contours";
import Source from "./Source";
import Layer from "./Layer";
import Terrain from "../layers/terrain";

const style = {
  width: '100vw',
  height: '100vh',
  background: '#d0e6f4'
}

const terrain = {
  source: 'dem',
  exaggeration: 1
}

const Context = React.createContext<{ map: Map }>({
  map: null!,
});

export function useMap() {
  return useContext(Context)
}

const sources = baseLayers.flatMap(b => Object.entries(b.sources).map(([key, spec]) => <Source key={key} id={key} spec={spec as any} />))

export default function MapContext(props: React.PropsWithChildren) {
  const routeParams = useParams();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [map, setMap] = React.useState<Map>();

  const basemap = baseLayers.find(r => r.id === routeParams.basemap) ?? linzVector

  // Initial setup
  useEffect(() => {
    const map = new Map({
      container: containerRef.current!,
      center: [routeParams.lon, routeParams.lat],
      zoom: routeParams.zoom,
      pitch: routeParams.pitch,
      style: {
        version: 8,
        glyphs: "https://basemaps.linz.govt.nz/v1/fonts/{fontstack}/{range}.pbf",
        sprite: "https://basemaps.linz.govt.nz/v1/sprites/topographic",
        sources: {},
        layers: []
      },
      scrollZoom: true,
      boxZoom: false,
      doubleClickZoom: true,
      dragPan: true,
      dragRotate: true,
      touchPitch: true,
      maxPitch: 75
    })
      .addControl(new ScaleControl({
        maxWidth: 150,
        unit: 'metric'
      }), 'bottom-left')
      .addControl(new GeolocateControl({
        trackUserLocation: true,
        showUserLocation: true
      }))
      .addControl(new NavigationControl({
        showCompass: true
      }))

    setMap(map);
  }, []);

  // Swap to/from 3d mode when the view changes
  React.useEffect(() => {
    const t = routeParams.pitch === 0 ? null : terrain;
    if (map?.getTerrain() !== t) map?.setTerrain(t)
  }, [routeParams.pitch])

  return <div ref={containerRef} style={style}>
    {map && <Context.Provider value={{ map: map }}>
      {sources}
      {basemap.layers.map(l => <Layer key={l.id} layer={l} />)}
      <Terrain />

      {overlays.filter(e => routeParams.overlays.includes(e.id)).map(o => typeof o.source === 'function' ? <o.source key={o.id} /> : o.source)}

      {props.children}
    </Context.Provider>}
  </div>
}
