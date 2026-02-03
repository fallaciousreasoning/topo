import React from "react";
import { allRoutes, getPicture } from "../utils/mountain";
import Card from "./Card";
import { Mountain } from "../layers/mountains";
import { useRouteUpdater } from "../routing/router";

export default function MountainCard(props: { mountain: Mountain }) {
    const routes = allRoutes(props.mountain)
    const picture = getPicture(props.mountain)
    const updateRoute = useRouteUpdater()

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (props.mountain.latlng) {
            const [lat, lng] = props.mountain.latlng;
            const name = `${props.mountain.name} (${props.mountain.altitude})`;
            updateRoute({
                lat,
                lon: lng,
                page: `location/${lat}/${lng}/${encodeURIComponent(name)}`
            });
        }
    };

    const href = props.mountain.latlng
        ? `#page=location/${props.mountain.latlng[0]}/${props.mountain.latlng[1]}/${encodeURIComponent(`${props.mountain.name} (${props.mountain.altitude})`)}`
        : '#';

    return <a className="text-black no-underline hover:shadow"
        href={href}
        onClick={handleClick}> <Card imageUrl={picture}
            title={`${props.mountain.name} (${props.mountain.altitude})`}>
            {props.mountain.places.length + 1} areas,
            {routes.length} routes
        </Card>
    </a>
}
