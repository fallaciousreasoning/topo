import { RequestParameters } from 'maplibre-gl'
import { addProtocol, getData } from './protocols'

const failed = { data: null }

const PROTOCOL = 'alpha-blend'

// protocol:
// alpha-blend://0.9?url=${encodeURIComponent(url1)}&url=${encodeURIComponent(url2)}
export const createBlendLayer = (alpha: number, ...urls: string[]) => {
    return `${PROTOCOL}://${alpha}?${urls.map(u => `url=${encodeURIComponent(u)}`).join('&')}`
        .replaceAll('%7Bz%7D', '{z}')
        .replaceAll('%7Bx%7D', '{x}')
        .replaceAll('%7By%7D', '{y}')
}

const canvas = document.createElement('canvas')
canvas.width = 256
canvas.height = 256
const context = canvas.getContext('2d')!
context.globalCompositeOperation = 'color-burn'

window['canvas'] = canvas

const loadImage = async (params: RequestParameters, abortController: AbortController) => {
    const { data } = await getData(params, abortController)
    const image = new Image()
    const { resolve, promise, reject } = Promise.withResolvers<HTMLImageElement>()

    const blob = new Blob([data])
    image.src = URL.createObjectURL(blob)
    image.onload = () => resolve(image)
    image.onerror = reject

    return promise
}

addProtocol('alpha-blend', async (params, abortController) => {
    const [blend, searchParamsRaw] = params.url.split('://')[1].split('?')
    const searchParams = new URLSearchParams(searchParamsRaw)
    const urls = searchParams.getAll('url')

    try {
        const imageBuffers = await Promise.all(urls.map(r => loadImage({ ...params, url: r }, abortController)))
        context.clearRect(0, 0, canvas.width, canvas.height)

        let alpha = 1
        for (const buffer of imageBuffers) {
            context.drawImage(buffer, 0, 0)
            alpha *=1
        }

        const {resolve, promise} = Promise.withResolvers<Blob | null>()
        canvas.toBlob(resolve)
        const blob = await promise

        const image = new Image()
        image.src = URL.createObjectURL(blob!)

        document.body.appendChild(image)
        return {
            data: await blob!.arrayBuffer()
        }
    } catch (err) {
        console.log(err)
    }

    return failed
})
