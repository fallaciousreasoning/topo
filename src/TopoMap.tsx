import { Map, GeolocateControl, NavigationControl } from 'react-map-gl/maplibre';
import * as React from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import linzAerial from './layers/linzAerial';
import { getMapStyle } from './layers/layerDefinition';
import linzVector from './layers/linzVector';
import { overlays } from './layers/layerDefinition';
import topoRaster from './layers/topoRaster';
import osm from './layers/osm';
import openTopo from './layers/openTopo';

const aoraki = {
    latitude: -43.59557,
    longitude: 170.1422,
    zoom: 14
}

const mapStyle = {
    width: '100vw',
    height: '100vh',
    background: '#d0e6f4'
}

export default function TopoMap() {
    return <Map
        scrollZoom
        boxZoom={false}
        doubleClickZoom
        pitchWithRotate={false}
        dragRotate
        initialViewState={aoraki}
        mapStyle={getMapStyle(linzVector)}
        style={mapStyle}>
        <GeolocateControl />
        <NavigationControl />
        {/* <LinzAerial /> */}
        {/* <LinzVector /> */}
        {}
        {overlays.map(o => o.source)}
    </Map>
}
