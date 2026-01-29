import Popup from "../map/Popup"
import { useParams, useRouteUpdater } from "../routing/router"
import React, { useEffect, useState } from "react"
import db from "../caches/indexeddb"
import Button from "./Button"
import { Point } from "../tracks/point"

export default function () {
    const params = useParams()
    const updateRoute = useRouteUpdater()
    const [existingPoint, setExistingPoint] = useState<Point | null>(null)

    const show = params.lla && params.llo && params.lab

    useEffect(() => {
        if (show) {
            db.findPointByCoordinates(params.llo!, params.lla!).then(setExistingPoint)
        }
    }, [show, params.llo, params.lla])

    if (!show) return null

    const handleSavePoint = async () => {
        const point = await db.updatePoint({
            coordinates: [params.llo!, params.lla!],
            tags: [],
            name: params.lab,
            color: "#3b82f6",
        })

        updateRoute({
            lla: null,
            llo: null,
            lab: null,
            page: `point/${point.id}`,
        })
    }

    const handleRemovePoint = async () => {
        if (existingPoint) {
            await db.deletePoint(existingPoint)
            setExistingPoint(null)
            updateRoute({
                lla: null,
                llo: null,
                lab: null,
            })
        }
    }

    const handleEditPoint = () => {
        if (existingPoint) {
            updateRoute({
                lla: null,
                llo: null,
                lab: null,
                page: `point/${existingPoint.id}`,
            })
        }
    }

    return <Popup key={params.lab! + params.lla! + params.llo!} latitude={params.lla!} longitude={params.llo!} anchor="bottom" onClose={() => {
        updateRoute({
            lla: null,
            llo: null,
            lab: null
        })
    }}>
        <div className="flex items-center gap-2">
            <div className="flex-1">{params.lab}</div>
            <div className="flex gap-1">
                {existingPoint && (
                    <button
                        onClick={handleEditPoint}
                        className="text-xs border rounded px-1 py-0.5 hover:bg-gray-100 transition-colors"
                        title="Edit point"
                    >
                        ✏️
                    </button>
                )}
                {existingPoint ? (
                    <button
                        onClick={handleRemovePoint}
                        className="text-xs border rounded px-1 py-0.5 hover:bg-yellow-50 transition-colors"
                        style={{ color: '#fbbf24' }}
                        title="Remove saved point"
                    >
                        ★
                    </button>
                ) : (
                    <button
                        onClick={handleSavePoint}
                        className="text-xs border rounded px-1 py-0.5 hover:bg-gray-100 transition-colors"
                        title="Save point"
                    >
                        ☆
                    </button>
                )}
            </div>
        </div>
    </Popup>
}
