import * as React from 'react'
import { createRoot } from 'react-dom/client'
import TopoMap from './TopoMap'

function App() {
    return <>
        <TopoMap />
    </>
}

createRoot(document.body).render(<App />)

