import * as React from 'react';
import Section from './Section';
import geocode from '../search/geocode';
import { usePromise } from '../hooks/usePromise';
import { useRouteUpdater } from '../routing/router';

export default function SearchSection() {
    const updateRoute = useRouteUpdater()
    const [query, setQuery] = React.useState('')
    const { result = [] } = usePromise(() => geocode(query), [query])
    return <Section page='search' closable exact title='Search'>
        <input type='search' className='w-full p-2 sticky top-2' value={query} onChange={e => setQuery(e.target.value)} />
        {result.map(r => <div className='w-full px-2 py-1 hover:bg-gray-300 cursor-pointer' onClick={() => updateRoute({
            lat: r.lat,
            lon: r.lon
        })}>
            {r.name} ({r.type})
        </div>)}
    </Section>
}
