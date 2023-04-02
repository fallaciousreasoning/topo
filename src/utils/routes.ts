import { Mountain } from "../stores/mountains";

export const allRoutes = (mountain: Mountain) => {
    return [
        ...mountain.routes,
        ...mountain.places.flatMap(p => p.routes)
    ]
}

export function* getPictures(mountain: Mountain) {
    if (mountain.image)
        yield mountain.image

    for (const place of mountain.places) {
        if (place.image) yield place.image

        for (const route of place.routes) {
            if (route.image) yield route.image
        }
    }

    for (const route of mountain.routes) {
        if (route.image) yield route.image
    }
}

export function getPicture(mountain: Mountain) {
    for (const pic of getPictures(mountain))
        return pic
}
