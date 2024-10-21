import React, { useCallback } from "react";

export default function Checkbox(props: React.PropsWithChildren<{ checked: boolean, onChange: (checked: boolean) => void }>) {
    const cb = useCallback(e => {
        props.onChange(e.target.checked)
    }, [props.onChange])
    return <label className="flex gap-1 items-center">
        <input className="bg-purple-600 hover:bg-purple-700" type="checkbox" checked={props.checked} onChange={cb} />
        {props.children}
    </label>
}
