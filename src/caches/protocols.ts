import { AddProtocolAction, addProtocol as addProtocolInternal, removeProtocol as removeProtocolInternal } from "maplibre-gl"

const protocols: {
    [scheme: string]: AddProtocolAction
} = {}

export function getProtocol(url: string) {
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
