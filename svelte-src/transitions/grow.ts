export default (node, { 
    delay = 0, 
    duration = 200, 
    easing = x => x,
    animateWidth = true,
    animateHeight = true 
}) => {
    const { width, height } = node.getBoundingClientRect();
    return {
        delay,
        duration,
        css: t => {
            const eased = easing(t);
            let result = '';
            if (animateWidth)
                result += `width: ${width * eased}px;`;
            if (animateHeight)
                result += `height: ${height * eased}px`;
            return result;
        },
    }
}