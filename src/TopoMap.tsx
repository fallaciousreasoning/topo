import { StyleSpecification, TerrainControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as React from 'react';
import { GeolocateControl, Map, MapRef, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
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
import SettingsSection from './sections/SettingsSection';
import MenuSection from './sections/MenuSection';
import MenuControl from './controls/MenuControl';
import JMap from './map/Map'

export default function TopoMap() {
    return <JMap>
        <SearchSection />
        <MountainsSection />
        <MountainSection />
        <SettingsSection />

        <PositionSyncer />
        <MenuSection />
        <LayersControl />
        <MenuControl />
        <SearchControl />
    </JMap>
    // return <Map
    //     ref={mapRef as any}
    // // scrollZoom
    // // boxZoom={false}
    // // doubleClickZoom
    // // pitchWithRotate={true}
    // // dragRotate
    // // touchPitch
    // // maxPitch={75}
    // // terrain={routeParams.pitch === 0 ? undefined : terrain}
    // // initialViewState={{
    // //     latitude: routeParams.lat,
    // //     longitude: routeParams.lon,
    // //     zoom: routeParams.zoom,
    // //     bearing: routeParams.rotation,
    // // }}
    // // mapStyle={mapStyle}
    // // style={style}
    // >
    //     <MapLabel />
    //     {/* <ScaleControl maxWidth={150} position='bottom-left' unit='metric' /> */}
    //     <LongPressLookup />

    //     <Terrain />
    //     {overlays.filter(e => routeParams.overlays.includes(e.id)).map(o => typeof o.source === 'function' ? <o.source key={o.id} /> : o.source)}
    // </Map>
}
