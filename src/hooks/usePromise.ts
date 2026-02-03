import { useEffect, useState } from "react"

export const usePromise = <T>(getPromise: () => Promise<T>, deps: any[]) => {
    const [result, setResult] = useState<T | undefined>()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<any>()

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)

        getPromise()
            .then(r => {
                if (cancelled) return
                setResult(r)
            })
            .catch(err => {
                if (cancelled) return
                setError(err)
            })
            .finally(() => {
                if (cancelled) return
                setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, deps)

    return {
        result,
        loading,
        error
    }
}
