import { RequestParameters } from 'maplibre-gl'
import { addProtocol, getData } from './protocols'

const failed = { data: null }

const PROTOCOL = 'composite-layer'

// protocol:
// composite-layer://color-burn?url=${encodeURIComponent(url1)}&url=${encodeURIComponent(url2)}
export const createCompositeLayer = (blendMode: GlobalCompositeOperation, ...urls: string[]) => {
    return `${PROTOCOL}://${blendMode}?${urls.map(u => `url=${encodeURIComponent(u)}`).join('&')}`
        .replaceAll('%7Bz%7D', '{z}')
        .replaceAll('%7Bx%7D', '{x}')
        .replaceAll('%7By%7D', '{y}')
}

const loadImage = async (params: RequestParameters, abortController: AbortController) => {
    const { data } = await getData(params, abortController)
    const image = new Image()
    const { resolve, promise, reject } = Promise.withResolvers<HTMLImageElement>()

    const blob = new Blob([data])
    image.src = URL.createObjectURL(blob)
    image.onload = () => resolve(image)
    image.onerror = reject

    return promise
        .catch(() => null)
}

// TODO: This would be better off in a Worker
addProtocol(PROTOCOL, async (params, abortController) => {
    const [blendMode, searchParamsRaw] = params.url.split('://')[1].split('?')
    const searchParams = new URLSearchParams(searchParamsRaw)
    const urls = searchParams.getAll('url')
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext('2d')!
    context.globalCompositeOperation = blendMode as GlobalCompositeOperation

    try {
        const imageBuffers = await Promise.all(urls.map(r => loadImage({ ...params, url: r }, abortController)))
        context.clearRect(0, 0, canvas.width, canvas.height)

        for (const buffer of imageBuffers) {
            if (!buffer) continue
            context.drawImage(buffer, 0, 0)
        }

        const { resolve, promise } = Promise.withResolvers<Blob | null>()
        canvas.toBlob(resolve)
        const blob = await promise

        return {
            data: await blob!.arrayBuffer()
        }
    } catch (err) {
        console.log(err)
    }

    return failed
})
