import * as React from 'react';
import Section from './Section';
import geocode from '../search/geocode';
import { usePromise } from '../hooks/usePromise';
import { useRouteUpdater } from '../routing/router';
import { Place } from '../search/places';

export default function SearchSection() {
    const updateRoute = useRouteUpdater()
    const [query, setQuery] = React.useState('')
    const { result = [] } = usePromise(() => geocode(query), [query])
    const [selectedIndex, setSelectedIndex] = React.useState<number>()

    const selectResult = (r: Place) => updateRoute({
        lla: r.lat,
        llo: r.lon,
        lab: r.name
    })

    React.useEffect(() => {
        setSelectedIndex(undefined)
    }, [query])

    return <Section page='search' closable exact title='Search'>
        <input type='search' className='w-full p-2 sticky top-2' value={query} onKeyDown={(e) => {
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
        {result.map((r, i) => <div className={`w-full px-2 py-1 hover:bg-gray-300 cursor-pointer ${i === selectedIndex && 'bg-gray-200'}`} onClick={() => selectResult(r)}>
            {r.name} ({r.type})
        </div>)}
    </Section>
}
