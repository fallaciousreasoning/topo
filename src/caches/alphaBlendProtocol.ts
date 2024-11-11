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
// context.globalCompositeOperation = 'multiply'

window['canvas'] = canvas

addProtocol('alpha-blend', async (params, abortController) => {
    const [blend, searchParamsRaw] = params.url.split('://')[1].split('?')
    const searchParams = new URLSearchParams(searchParamsRaw)
    const urls = searchParams.getAll('url')

    try {
        const imageBuffers = await Promise.all(urls.map(r => getData({ ...params, url: r }, abortController)))
        context.clearRect(0, 0, canvas.width, canvas.height)

        for (const buffer of imageBuffers) {
            debugger;
            const imageData = new ImageData(new Uint8ClampedArray(buffer.data), 256, 256)
            context.putImageData(imageData, 0, 0)
        }
        context.fillStyle = 'red'
        context.fillRect(10, 10, 240, 240)

        const image = context.getImageData(0, 0, 256, 256)
        return {
            data: new Uint8Array(image.data)
        }
    } catch (err) {
        console.log(err)
    }

    return failed
})
