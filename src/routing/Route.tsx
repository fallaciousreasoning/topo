import * as React from 'react';
import { useParams } from './router';

interface Props {
    path: string,
    exact: boolean
    children: React.ReactNode | ((props: any) => React.ReactNode)
}

const parseMatch = (currentPage: string | null, path: string, exact: boolean) => {
    if (!currentPage)
        return currentPage === path;

    const pathParts = path.split('/');
    const pageParts = currentPage.split('/')

    if (exact && pageParts.length !== pathParts.length) return false

    const params = {}
    for (let i = 0; i < pathParts.length; ++i) {
        const pathPart = pathParts[i]
        const pagePart = pageParts[i]

        if (pathPart.startsWith(':')) {
            params[pathPart.replace(/(^:)|(\?$)/gi, '')] = pagePart

            // We can't have empty path parts, unless the user has said they can be
            // empty.
            if (!pathPart && !pagePart.endsWith('?')) return false;
            continue
        }

        if (pathPart !== pagePart) return false
    }

    return params
}

export default function Route({ path = '', exact = false, children }: Props) {
    const { page } = useParams()
    const match = parseMatch(page, path, exact)

    if (!match) return null

    return typeof children === 'function'
        ? children(match)
        : children
}
