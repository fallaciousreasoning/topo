import * as React from 'react';
import Route from '../routing/Route';
import { useRouteUpdater } from '../routing/router';

interface Props {
    page: string
    title: string
    closable: boolean
    exact: boolean
    escapeCloses?: boolean,
    children: React.ReactNode | ((props: any) => React.ReactNode)
}

export default function Section(props: Props) {
    const escapeCloses = props.escapeCloses ?? true
    const updateRoute = useRouteUpdater()

    return <Route path={props.page} exact={props.exact}>
        {routeParams => <div onKeyDown={e => {
            if (!escapeCloses) return

            if (e.key === 'Escape') {
                updateRoute({ page: null })
            }
        }} className="bg-gray-100 px-4 py-2 z-20 shadow h-screen max-w-md w-screen absolute left-0 top-0 max-h-screen overflow-y-auto">
            <h2 className="font-semibold text-lg flex gap-1">
                {props.closable && <button onClick={e => updateRoute({ page: null })}>☰</button>}
                {props.title}
            </h2>
            {typeof props.children === "function"
                ? props.children(routeParams)
                : props.children}
        </div>}
    </Route>
}
