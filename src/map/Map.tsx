import { GeolocateControl, Map, NavigationControl, ScaleControl } from "maplibre-gl";
import React, { useContext, useEffect } from "react";
import Terrain from "../layers/terrain";
import { useParams } from "../routing/router";

const style = {
  width: '100vw',
  height: '100vh',
  background: '#d0e6f4'
}

const Context = React.createContext<{ map: Map }>({
  map: null!,
});

export function useMap() {
  return useContext(Context)
}


export default function MapContext(props: React.PropsWithChildren) {
  const routeParams = useParams();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [map, setMap] = React.useState<Map>();

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

  return <div ref={containerRef} style={style}>
    {map && <Context.Provider value={{ map: map }}>
      <Terrain />


      {props.children}
    </Context.Provider>}
  </div>
}
