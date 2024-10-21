import React from "react";

export default function Button(props: React.PropsWithChildren<{ onClick: () => void }>) {
    return <button className="bg-purple-600 hover:bg-purple-700 transition p-1 rounded-md text-white" onClick={props.onClick}>
        {props.children}
    </button>
}
