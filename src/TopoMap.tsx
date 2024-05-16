import { Map } from 'react-map-gl/maplibre';
import * as React from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import LinzAerial from './layers/LinzAerial';
import LinzVector from './layers/LinzTopoVector';
import Hillshade from './layers/Hillshade';
import Contours from './layers/Contours';

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
        dragPan
        dragRotate
        initialViewState={aoraki}
        style={mapStyle}>
        <LinzAerial />
        <LinzVector />
        <Hillshade />
        <Contours />
    </Map>
}
