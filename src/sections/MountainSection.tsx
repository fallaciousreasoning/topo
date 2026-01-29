import React, { useState, useEffect } from "react";
import Section from "./Section";
import { Mountain, MountainPitch, MountainRoute, getMountains } from "../layers/mountains";
import { usePromise } from "../hooks/usePromise";
import TopoText from "../components/TopoText";
import { repeatString } from "../utils/array";
import db from "../caches/indexeddb";
import { Point } from "../tracks/point";
import Button from "../components/Button";

const joinBits = (bits: (string | number | boolean | null | undefined)[]) => bits
    .filter(b => b)
    .join(' ')

function Pitches({ pitches }: { pitches: MountainPitch[] }) {
    const isOnly = pitches.length === 1
    const className = !isOnly ? 'list-decimal ml-8' : ''
    return <ol className={className}>
        {pitches.map((p, i) => <li key={i}>
            {!isOnly && joinBits([
                p.ewbank,
                p.alpine ?? p.mtcook,
                p.commitment,
                p.aid,
                p.ice,
                p.mixed,
                p.length && `(${p.length})`,
                p.bolts && `${p.bolts} bolts`,
                ' '
            ])}<TopoText text={p.description} />
        </li>)}
    </ol>
}
function RouteInfo({ route, scrollTo }: { route: MountainRoute, scrollTo?: boolean }) {
    return <div>
        <div className="font-bold">
            {joinBits([
                route.name,
                route.grade && `(${route.grade})`,
                route.bolts && `${route.bolts} bolts`,
                route.natural_pro && 'trad',
                repeatString('★', route.quality)
            ])}
        </div>
        {route.image && <a target="_blank" rel="noopener noreferrer" href={route.image}>
            <img
                className="h-64 w-full object-cover object-scale"
                alt={route.name}
                src={route.image} />
        </a>}
        <div>
            <TopoText text={route.description ?? ''} />
        </div>

        <Pitches pitches={route.pitches} />
        {route.ascent && <span className="italic">
            F.A. {route.ascent}
        </span>}
    </div>
}

function PlaceInfo({ mountain, scrollToRoute }: { mountain: Mountain, scrollToRoute?: string }) {
    const [savedPoint, setSavedPoint] = useState<Point | null>(null);

    useEffect(() => {
        if (mountain.latlng) {
            const [lat, lng] = mountain.latlng;
            db.findPointByCoordinates(lng, lat).then(setSavedPoint);
        }
    }, [mountain.latlng]);

    const handleSavePoint = async () => {
        if (!mountain.latlng) return;
        const [lat, lng] = mountain.latlng;

        await db.updatePoint({
            coordinates: [lng, lat],
            tags: ["mountain"],
            name: mountain.name,
            color: "#3b82f6",
        });

        // Refresh saved point state
        const point = await db.findPointByCoordinates(lng, lat);
        setSavedPoint(point);
    };

    const handleRemovePoint = async () => {
        if (savedPoint) {
            await db.deletePoint(savedPoint);
            setSavedPoint(null);
        }
    };

    return <div>
        <h2 className="font-bold text-lg flex items-center gap-2">
            <span className="flex-1">
                {mountain.name}{mountain.altitude && ` (${mountain.altitude})`}
            </span>
            {mountain.latlng && (
                savedPoint ? (
                    <button
                        onClick={handleRemovePoint}
                        className="text-xl border rounded px-2 py-1 hover:bg-yellow-50 transition-colors"
                        style={{ color: '#fbbf24' }}
                        title="Remove saved point"
                    >
                        ★
                    </button>
                ) : (
                    <button
                        onClick={handleSavePoint}
                        className="text-xl border rounded px-2 py-1 hover:bg-gray-100 transition-colors"
                        title="Save as point"
                    >
                        ☆
                    </button>
                )
            )}
        </h2>
        {mountain.image && <a target="_blank" href={mountain.image} rel="noopener noreferrer">
            <img className="h-64 w-full object-cover object-top" alt={mountain.name} src={mountain.image} />
        </a>}
        {mountain.access && <>
            <span className="font-bold">Access</span>
            <p>
                <TopoText text={mountain.access} />
            </p>
        </>}
        {mountain.description && <>
            <span className="font-bold">Description</span>
            <p>
                <TopoText text={mountain.description} />
            </p>
        </>}
        {!!mountain.routes.length && <>
            <span className="font-bold">Routes</span>
            {mountain.routes.map(r => <React.Fragment key={r.link}>
                <hr className="my-1" />
                <RouteInfo route={r} key={r.link} scrollTo={r.name === scrollToRoute} />
            </React.Fragment>)}
        </>}
    </div>
}

function MountainInfo({ id, route }: { id: string, route: string | undefined }) {
    const { result: mountains = {} } = usePromise(getMountains, [])
    const mountain = mountains[id] as Mountain | undefined

    if (!mountain) {
        return <span>Loading...</span>
    }
    return <>
        <PlaceInfo mountain={mountain} scrollToRoute={route} />
        {mountain.places.map(p => <React.Fragment key={p.link}>
            <hr className="my-3" />
            <PlaceInfo mountain={p} scrollToRoute={route} />
        </React.Fragment>)}
        <div>
            <a href={mountain.link} title={mountain.name} target="_blank" rel="noopener noreferrer">ClimbNZ</a>
        </div>
    </>
}

export default function MountainSection() {
    return <Section page="mountain/:id/:route?" title="Mountain" closable exact={false}>
        {({ id, route }) => <MountainInfo key={id} id={id} route={route} />}
    </Section>
}
