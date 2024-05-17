import * as React from 'react'
import { createRoot } from 'react-dom/client'
import TopoMap from './TopoMap'
import { Context } from './routing/router'
import './tailwind.pcss'

function App() {
    return <Context>
        <TopoMap />
    </Context>
}

createRoot(document.body).render(<App />)

