import fetch from "isomorphic-fetch"

export default async function (request, response) {
    const data = await fetch('https://www.metservice.com/publicData/webdata/maps-radar/weather-stations/nz').then(r => r.json());
    response.json(data)
}
