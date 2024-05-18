import 'maplibre-gl/dist/maplibre-gl.css';
import * as React from 'react';
import { GeolocateControl, Map, NavigationControl, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import LayersControl from './controls/LayersControl';
import { baseLayers, getMapStyle, overlays } from './layers/layerDefinition';
import linzVector from './layers/linzVector';
import { useParams, useRouteUpdater } from './routing/router';
import SearchControl from './controls/SearchControl';

const mapStyle = {
    width: '100vw',
    height: '100vh',
    background: '#d0e6f4'
}

export default function TopoMap() {
    const routeParams = useParams()
    const routeUpdater = useRouteUpdater()

    const updatePosition = (e: ViewStateChangeEvent) => {
        routeUpdater({
            lat: e.viewState.latitude,
            lon: e.viewState.longitude,
            zoom: e.viewState.zoom,
            rotation: e.viewState.bearing
        })
    }

    const basemap = baseLayers.find(r => r.id === routeParams.basemap) ?? linzVector
    return <Map
        scrollZoom
        boxZoom={false}
        doubleClickZoom
        pitchWithRotate={false}
        dragRotate
        initialViewState={{
            latitude: routeParams.lat,
            longitude: routeParams.lon,
            zoom: routeParams.zoom,
            bearing: routeParams.rotation
        }}
        onMoveEnd={updatePosition}
        mapStyle={getMapStyle(basemap)}
        style={mapStyle}>
        <GeolocateControl />
        <NavigationControl />
        <LayersControl />
        <SearchControl />
        {overlays.filter(e => routeParams.overlays.includes(e.id)).map(o => o.source)}
    </Map>
}
