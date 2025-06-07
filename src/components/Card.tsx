import React from "react";

export default function Card({ imageUrl, children, title, pretitle }: { imageUrl?: string, children?: React.ReactNode, title?: React.ReactNode, pretitle?: React.ReactNode }) {
    return <div className="bg-white rounded shadow w-full h-full overflow-hidden">
        {imageUrl && <img className="h-64 w-full object-cover object-top" src={imageUrl} />}
        <div className="p-2">
            {pretitle && <h4 className="text-md text-gray-600">{pretitle}</h4>}
            {title && <h3 className="font-bold text-lg">{title}</h3>}
            {children}
        </div>
    </div>
}
