import { useEffect, useMemo, useRef } from "react";
import { useMap } from "./Map";
import { createPortal } from "react-dom";
import { PopupOptions, Popup as PopupT } from 'maplibre-gl'

export default function Popup(props: React.PropsWithChildren<PopupOptions & {
    latitude: number,
    longitude: number,
    onOpen?: () => void,
    onClose?: () => void
}>) {
    const { map } = useMap()
    const container = useMemo(() => document.createElement('div'), [])

    const thisRef = useRef({ props })
    thisRef.current.props = props

    const popup: PopupT = useMemo(() => {
        const { children, ...rest } = props
        const pp = new PopupT(rest);
        pp.setLngLat([props.longitude, props.latitude]);
        pp.once('open', () => {
            thisRef.current.props.onOpen?.();
        });
        return pp;
    }, []);

    useEffect(() => {
        const onClose = () => {
            thisRef.current.props.onClose?.();
        };
        popup.on('close', onClose);
        popup.setDOMContent(container).addTo(map);

        return () => {
            // https://github.com/visgl/react-map-gl/issues/1825
            // onClose should not be fired if the popup is removed by unmounting
            // When using React strict mode, the component is mounted twice.
            // Firing the onClose callback here would be a false signal to remove the component.
            popup.off('close', onClose);
            if (popup.isOpen()) {
                popup.remove();
            }
        };
    }, []);

    window['popup'] = popup
    if (popup.isOpen()) {
        if (popup.getLngLat().lng !== props.longitude || popup.getLngLat().lat !== props.latitude) {
            popup.setLngLat([props.longitude, props.latitude]);
        }
    }

    return createPortal(props.children, container)
}
