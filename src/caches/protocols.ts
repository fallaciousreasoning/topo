import { addProtocol as addProtocolInternal, removeProtocol as removeProtocolInternal, GetResourceResponse, RequestParameters } from "maplibre-gl"

// MapLibre's AddProtocolAction allows any response data (images, strings, JSON), but all of our
// protocols serve raw ArrayBuffers, and callers (and maplibre-contour) rely on that.
export type AddProtocolAction = (requestParameters: RequestParameters, abortController: AbortController) => Promise<GetResourceResponse<ArrayBuffer>>

const protocols: {
    [scheme: string]: AddProtocolAction
} = {}

export function getProtocol(url: string): AddProtocolAction | undefined {
    return protocols[url.substring(0, url.indexOf('://'))];
}

export function addProtocol(customProtocol: string, loadFn: AddProtocolAction) {
    protocols[customProtocol] = loadFn;
    addProtocolInternal(customProtocol, loadFn)
}

export function removeProtocol(customProtocol: string) {
    delete protocols[customProtocol];
    removeProtocolInternal(customProtocol)
}

export function getData(params: RequestParameters, abortController: AbortController) {
    const protocolHandler = getProtocol(params.url)
    if (protocolHandler) {
        return protocolHandler(params, abortController)
    }

    return fetch(params.url, {
        signal: abortController.signal
    })
        .then(r => r.arrayBuffer())
        .then(d => ({ data: d }))
}
