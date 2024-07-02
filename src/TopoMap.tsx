import 'maplibre-gl/dist/maplibre-gl.css';
import * as React from 'react';
import { GeolocateControl, Layer, Map, MapRef, NavigationControl, Source, Style } from 'react-map-gl/maplibre';
import MapLabel from './components/MapLabel';
import LayersControl from './controls/LayersControl';
import LongPressLookup from './controls/LongPressLookup';
import PositionSyncer from './controls/PositionSyncer';
import SearchControl from './controls/SearchControl';
import { baseLayers, getMapStyle, overlays } from './layers/layerDefinition';
import linzVector from './layers/linzVector';
import { useParams } from './routing/router';
import SearchSection from './sections/SearchSection';
import MountainsSection from './sections/MountainsSection';
import MountainSection from './sections/MountainSection';
import { demSource, elevationEncoding } from './layers/contours';
import './caches/cachingProtocol'

const style = {
    width: '100vw',
    height: '100vh',
    background: '#d0e6f4'
}

export default function TopoMap() {
    const routeParams = useParams()

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
        pitchWithRotate={true}
        dragRotate
        touchPitch
        initialViewState={{
            latitude: routeParams.lat,
            longitude: routeParams.lon,
            zoom: routeParams.zoom,
            bearing: routeParams.rotation,
        }}
        // TODO: Only show this if the pitch is non-zero
        terrain={{
            source: 'dem',
            exaggeration: 1.5,
        }}
        mapStyle={mapStyle}
        style={style}>
        <SearchSection />
        <MountainsSection />
        <MountainSection />

        <GeolocateControl />
        <NavigationControl />
        <LayersControl />
        <SearchControl />
        <MapLabel />
        <PositionSyncer />
        <LongPressLookup />
        {overlays.filter(e => routeParams.overlays.includes(e.id)).map(o => typeof o.source === 'function' ? <o.source key={o.id} /> : o.source)}
        {/* <Source id="jay-dem" type='raster' tiles={[
            "http://localhost:8081/ele/{z}/{x}/{y}.png"
        ]} minzoom={9} maxzoom={14}>
            <Layer id="jay-dem" type='raster'/>
        </Source> */}
        <Source id="dem" type='raster-dem' encoding={elevationEncoding} tiles={[demSource.sharedDemProtocolUrl]} />
    </Map>
}
