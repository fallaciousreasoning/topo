export const throttle = <T extends unknown[]>(f: (...args: T) => void, frequency: number) => {
    let lastCall: number = 0
    let nextArgs: T | undefined = undefined
    let timeout: NodeJS.Timeout | undefined = undefined

    const invoke = () => {
        f(...nextArgs!)
        lastCall = Date.now()

        // Reset the timeout, if we have one.
        clearTimeout(timeout)
    }

    return (...args: T) => {
        nextArgs = args

        const now = Date.now() - lastCall
        const elapsed = now - lastCall

        if (elapsed >= frequency) {
            invoke();
            return
        }

        timeout = setTimeout(invoke, frequency - elapsed)
    }
}
