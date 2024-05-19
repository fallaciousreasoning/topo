import { useEffect, useRef, useState } from "react"

export const isMobileQuery = 'screen and (max-width: 448px)';
export const isSmallScreenQuery = 'screen and (max-width: 768px)';

export const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia(query)
        const handler = () => {
            setMatches(mq.matches)
        }
        handler()

        mq.addEventListener('change', handler)
        return () => {
            mq.removeEventListener('change', handler)
        }
    }, [query])

    return matches
}

export const useIsMobile = () => useMediaQuery(isMobileQuery)
export const useIsSmallScreen = () => useMediaQuery(isSmallScreenQuery)
