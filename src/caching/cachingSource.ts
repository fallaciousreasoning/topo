import XYZ from "ol/source/XYZ";
import { Options } from "ol/source/XYZ";
import * as localforage from "localforage";

export default (options: Options) => {
    return new XYZ({
        ...options,
        tileLoadFunction: async (tile, source) => {
            let data: Blob = await localforage.getItem(source);
            if (!data) {
                const response = await fetch(source);
                data = await response.blob();
                localforage.setItem(source, data);
            }
            const image: HTMLImageElement = tile['getImage']();
            const url = URL.createObjectURL(data);
            image.src = url;
        }
    })
}