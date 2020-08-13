export const canvasEncode = async (data: ImageData, type: string, quality: number=1): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context)
        throw new Error("Canvas was not initialized");

    canvas.width = data.width;
    canvas.height = data.height;

    context.putImageData(data, 0, 0);

    let blob: Blob | null;

    if ('toBlob' in canvas) {
        blob = await new Promise(r => canvas.toBlob(r, type, quality));
    } else {
        // Welcome to Edge.
        // TypeScript thinks `canvas` is 'never', so it needs casting.
        const dataUrl = (canvas as HTMLCanvasElement).toDataURL(type, quality);
        const result = /data:([^;]+);base64,(.*)$/.exec(dataUrl);

        if (!result) throw Error('Data URL reading failed');

        const outputType = result[1];
        const binaryStr = atob(result[2]);
        const data = new Uint8Array(binaryStr.length);

        for (let i = 0; i < data.length; i += 1) {
            data[i] = binaryStr.charCodeAt(i);
        }

        blob = new Blob([data], { type: outputType });
    }

    if (!blob)
        throw new Error("Reencoding failed!");

    return blob;
}