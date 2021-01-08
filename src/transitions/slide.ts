import { transform } from "ol/proj";

export default (node, { 
    delay = 0, 
    duration = 200, 
    easing = t => t,
    xFrom = -1,
    yFrom = 0
}) => {
    return {
        delay,
        duration,
        css: t => {
            const eased = 1 - easing(t);
            const xAmount = eased * xFrom;
            const yAmount = eased * yFrom;
            return `transform: translate(${xAmount*100}%, ${yAmount*100}%)`;
        },
    }
}