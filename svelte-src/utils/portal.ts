export default (node: Node, selector: string) => {
    const parent = document.querySelector(selector);
    if (!parent)
        throw new Error(`Couldn't find a node matching ${selector}`);

    parent.appendChild(node);
    return {
        destroy() {
            parent.removeChild(node);
        },
    };
};