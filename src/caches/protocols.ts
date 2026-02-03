import { AddProtocolAction, addProtocol as addProtocolInternal, removeProtocol as removeProtocolInternal, RequestParameters } from "maplibre-gl"

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
