import { StyleSpecification, TerrainControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as React from 'react';
import { GeolocateControl, Map, MapRef, NavigationControl } from 'react-map-gl/maplibre';
import './caches/cachingProtocol';
import MapLabel from './components/MapLabel';
import LayersControl from './controls/LayersControl';
import LongPressLookup from './controls/LongPressLookup';
import PositionSyncer from './controls/PositionSyncer';
import SearchControl from './controls/SearchControl';
import { baseLayers, getMapStyle, overlays } from './layers/layerDefinition';
import linzVector from './layers/linzVector';
import { useParams } from './routing/router';
import MountainSection from './sections/MountainSection';
import MountainsSection from './sections/MountainsSection';
import SearchSection from './sections/SearchSection';
import Terrain from './layers/terrain';

const style = {
    width: '100vw',
    height: '100vh',
    background: '#d0e6f4'
}

export default function TopoMap() {
    const routeParams = useParams()

    const mapRef = React.useRef<MapRef>()

    const basemap = baseLayers.find(r => r.id === routeParams.basemap) ?? linzVector
    const mapStyle = React.useMemo(() => getMapStyle(basemap), [basemap]) as StyleSpecification

    // Note: Setting this directly has no effect.
    React.useEffect(() => {
        if (!mapRef.current) return
        const map = mapRef.current.getMap();

        map.setTerrain(routeParams.pitch === 0 ? null : {
            source: 'dem',
            exaggeration: 1.5,
        })
    }, [routeParams.pitch])

    return <Map
        ref={mapRef as any}
        scrollZoom
        boxZoom={false}
        doubleClickZoom
        pitchWithRotate={true}
        dragRotate
        touchPitch
        maxPitch={75}
        initialViewState={{
            latitude: routeParams.lat,
            longitude: routeParams.lon,
            zoom: routeParams.zoom,
            bearing: routeParams.rotation,
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
        <Terrain />
        {overlays.filter(e => routeParams.overlays.includes(e.id)).map(o => typeof o.source === 'function' ? <o.source key={o.id} /> : o.source)}
    </Map>
}
