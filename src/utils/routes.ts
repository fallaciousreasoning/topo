import { Mountain } from "../stores/mountains";

export const allRoutes = (mountain: Mountain) => {
    return [
        ...mountain.routes,
        ...mountain.places.flatMap(p => p.routes)
    ]
}
