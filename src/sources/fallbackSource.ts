import XYZ from "ol/source/XYZ";
import { resolvable } from "../utils/promise";

export default (...sources: string[]) => {
    return new XYZ({
        urls: sources,
        async tileLoadFunction(tile) {
            const image: HTMLImageElement = tile['getImage']();
            
            for (const source of sources) {
                image.src = source;

                const { resolve, promise } = resolvable<boolean>();
                image.addEventListener('error', () => resolve(false), { once: true });
                image.addEventListener('load', () => resolve(true), { once: true });

                const success = await promise;
                if (success) break;
            }
        }
    })
}