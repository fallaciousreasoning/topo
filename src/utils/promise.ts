export const resolvable = <T>() => {
    let resolve: (result: T) => void;
    let reject: (err: any) => void;
    const promise = new Promise<T>((a, r) => {
        resolve = a;
        reject = r;
    });

    return {
        promise,
        resolve,
        reject
    };
}
