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
context.globalCompositeOperation = 'multiply'
context.globalAlpha = 0.8

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
            context.globalAlpha = 0.5
            context.drawImage(buffer, 0, 0)
        }
        // context.fillStyle = 'red'
        // context.fillRect(10, 10, 240, 240)

        const blob = new Blob([context.getImageData(0, 0, canvas.width, canvas.height).data])
        const image = new Image()
        const {resolve, promise} = Promise.withResolvers()
        image.src = URL.createObjectURL(blob)
        image.onload = resolve

        document.body.appendChild(image)
await promise;
        return {
            data: await blob.arrayBuffer()
        }
    } catch (err) {
        console.log(err)
    }

    return failed
})
