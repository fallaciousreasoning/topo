import React from "react";
import { allRoutes, getPicture } from "../utils/mountain";
import Card from "./Card";
import { Mountain } from "../layers/mountains";
import { useRouteUpdater } from "../routing/router";

export default function MountainCard(props: { mountain: Mountain }) {
    const routes = allRoutes(props.mountain)
    const picture = getPicture(props.mountain)
    const updateRoute = useRouteUpdater()

    return <a className="text-black no-underline"
        href={`#page=mountain/${encodeURIComponent(props.mountain.link)}`}
        onClick={e => {
            e.preventDefault();
            updateRoute({
                lat: props.mountain.latlng?.[0],
                lon: props.mountain.latlng?.[1],
                page: `mountain/${encodeURIComponent(props.mountain.link)}`
            })
        }}> <Card imageUrl={picture}
            title={`${props.mountain.name} (${props.mountain.altitude})`}>
            {props.mountain.places.length + 1} areas,
            {routes.length} routes
        </Card>
    </a>
}
