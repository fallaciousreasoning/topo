import React from "react";
import { Mountain } from "../../svelte-src/stores/mountains";
import { allRoutes, getPicture } from "../utils/mountain";
import Card from "./Card";

export default function MountainCard(props: { mountain: Mountain }) {
    const routes = allRoutes(props.mountain)
    const picture = getPicture(props.mountain)
    return <Card imageUrl={picture}
        title={`${props.mountain.name} (${props.mountain.altitude})`}>
        {props.mountain.places.length + 1} areas,
        {routes.length} routes
    </Card>
}
