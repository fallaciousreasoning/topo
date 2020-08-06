const baseUrl = 'https://nominatim.openstreetmap.org/search'
export default (query: string) => {
    return fetch(`${baseUrl}?q=${encodeURIComponent(query)}&format=jsonv2`).then(r => r.json());
}