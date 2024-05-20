import React from "react";

export default function Input(props: JSX.IntrinsicElements["input"]) {
    return <input className='w-full p-2 sticky top-2 border-gray-300 border rounded outline-none' {...props} />
}
