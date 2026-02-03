import * as React from 'react';
import Section from './Section';
import geocode from '../search/geocode';
import { usePromise } from '../hooks/usePromise';
import { useRouteUpdater } from '../routing/router';
import { Place } from '../search/places';
import { useIsMobile } from '../hooks/useMediaQuery';
import Input from '../components/Input';
import { getElevation } from '../layers/contours';
import round from '../utils/round';
import { useMap } from '../map/Map';

export default function SearchSection() {
    const updateRoute = useRouteUpdater()
    const isMobile = useIsMobile()
    const [query, setQuery] = React.useState('')
    const { result = [] } = usePromise(() => geocode(query), [query])
    const [selectedIndex, setSelectedIndex] = React.useState<number>()
    const { map } = useMap()

    const selectResult = async (r: Place) => {
        const lat = parseFloat(r.lat)
        const lon = parseFloat(r.lon)

        updateRoute({
            page: `location/${lat}/${lon}/${encodeURIComponent(r.name)}`,
            lat,
            lon
        })

        map.flyTo({
            animate: true,
            center: [lon, lat]
        })
    }

    React.useEffect(() => {
        setSelectedIndex(undefined)
    }, [query])

    return <Section page='search' closable exact title='Search'>
        <Input type='search' placeholder='Search...' autoFocus value={query} onKeyDown={(e) => {
            if (!['ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return
            e.preventDefault()

            if (e.key === 'Enter' && selectedIndex !== undefined) {
                selectResult(result[selectedIndex])
            } else if (e.key === 'ArrowUp') {
                setSelectedIndex(i => !i ? result.length - 1 : i - 1)
            } else if (e.key === 'ArrowDown') {
                setSelectedIndex(i => i === undefined ? 0 : (i + 1) % result.length)
            }
        }} onChange={e => setQuery(e.target.value)} />
        {result.map((r, i) => <div key={i} className={`w-full px-2 text-md py-0.5 hover:bg-gray-300 cursor-pointer ${i === selectedIndex && 'bg-gray-200'}`} onClick={() => selectResult(r)}>
            {r.name} ({r.type})
        </div>)}
    </Section>
}
