import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import TopoMap from './TopoMap'
import { Context } from './routing/router'
import './tailwind.pcss'
import SearchSection from './sections/SearchSection'

function App() {
    return <Context>
        <TopoMap />
        <Analytics />
    </Context>
}

createRoot(document.body).render(<App />)

