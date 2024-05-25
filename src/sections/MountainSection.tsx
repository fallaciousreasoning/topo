import React from "react";
import { useParams } from "../routing/router";
import Section from "./Section";
import { Mountain, Route } from "../../svelte-src/stores/mountains";
import { getMountains } from "../layers/mountains";
import { usePromise } from "../hooks/usePromise";

function RouteInfo({ route, scrollTo }: { route: Route, scrollTo?: boolean }) {
    return <div></div>
}

function PlaceInfo({ mountain, scrollToRoute }: { mountain: Mountain, scrollToRoute?: string }) {
    return <div>
        <h2 className="font-bold text-lg">
            {mountain.name}{mountain.altitude && ` (${mountain.altitude})`}
        </h2>
        {mountain.image && <a target="_blank" href={mountain.image} rel="noopener noreferrer">
            <img className="h-64 w-full object-cover object-top" alt={mountain.name} src={mountain.image} />
        </a>}
        {mountain.description && <>
            <span className="font-bold">Description</span>
            <p>
                {mountain.description}
            </p>
        </>}
        {mountain.routes.length && <>
            <span className="font-bold">Routes</span>
            {mountain.routes.map(r => <>
                <hr />
                <RouteInfo route={r} key={r.link} scrollTo={r.name === scrollToRoute} />
            </>)}
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
            <hr />
            <PlaceInfo mountain={p} scrollToRoute={route} />
        </React.Fragment>)}
        <div>
            <a href={mountain.link} title={mountain.name} target="_blank" rel="noopener noreferrer">ClimbNZ</a>
        </div>
    </>
}

export default function MountainSection() {
    return <Section page="/mountains/:id/:route?" title="Mountain" closable exact={false}>
        {({ id, route }) => <MountainInfo key={id} id={id} route={route} />}
    </Section>
}
