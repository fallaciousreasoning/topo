export const range = (n: number) => {
    return Array.from(Array(n)).map((_, i) => i)
}

export const repeat = <T>(item: T, times: number) => {
    return range(times).map(i => item)
}

export const repeatString = (str: string, times: number) => repeat(str, times).join('')
