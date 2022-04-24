const bypassCors = "https://progrssive-cors.herokuapp.com/";

export const corsFetch = (request: string, init?: RequestInit) => {
    const url = `${bypassCors}${request}`;
    return fetch(url, init);
}