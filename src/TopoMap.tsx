import 'maplibre-gl/dist/maplibre-gl.css';
import * as React from 'react';
import { GeolocateControl, Map, MapRef, NavigationControl, ViewStateChangeEvent, Style } from 'react-map-gl/maplibre';
import LayersControl from './controls/LayersControl';
import { baseLayers, getMapStyle, overlays } from './layers/layerDefinition';
import linzVector from './layers/linzVector';
import { useParams, useRouteUpdater } from './routing/router';
import SearchControl from './controls/SearchControl';
import MapLabel from './components/MapLabel';
import LongPressLookup from './controls/LongPressLookup';

const style = {
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

    const mapRef = React.useRef<MapRef>()
    React.useEffect(() => {
        if (routeParams.lat && routeParams.lon)
            mapRef.current?.setCenter([routeParams.lon, routeParams.lat])
    }, [routeParams.lat, routeParams.lon])

    React.useEffect(() => {
        if (routeParams.zoom)
            mapRef.current?.setZoom(routeParams.zoom)
    }, [routeParams.zoom])

    React.useEffect(() => {
        if (routeParams.rotation)
            mapRef.current?.setBearing(routeParams.rotation)
    }, [routeParams.rotation])


    const basemap = baseLayers.find(r => r.id === routeParams.basemap) ?? linzVector
    const mapStyle = React.useMemo(() => getMapStyle(basemap), [basemap]) as Style

    return <Map
        ref={mapRef as any}
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
        mapStyle={mapStyle}
        style={style}>
        <GeolocateControl />
        <NavigationControl />
        <LayersControl />
        <SearchControl />
        <MapLabel />
        <LongPressLookup />
        {overlays.filter(e => routeParams.overlays.includes(e.id)).map(o => o.source)}
    </Map>
}
