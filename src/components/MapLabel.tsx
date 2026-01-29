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
        await db.updatePoint({
            coordinates: [params.llo!, params.lla!],
            tags: [],
            name: params.lab,
            color: "#3b82f6",
        })

        updateRoute({
            lla: null,
            llo: null,
            lab: null,
            page: "points",
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

    const handleOpenPoint = () => {
        updateRoute({
            lla: null,
            llo: null,
            lab: null,
            page: "points",
        })
    }

    return <Popup key={params.lab! + params.lla! + params.llo!} latitude={params.lla!} longitude={params.llo!} anchor="bottom" onClose={() => {
        updateRoute({
            lla: null,
            llo: null,
            lab: null
        })
    }}>
        <div className="flex flex-col gap-2">
            <div>{params.lab}</div>
            {existingPoint ? (
                <div className="flex gap-2">
                    <Button onClick={handleOpenPoint}>
                        Open in Points
                    </Button>
                    <Button onClick={handleRemovePoint}>
                        Remove
                    </Button>
                </div>
            ) : (
                <Button onClick={handleSavePoint}>
                    Save Point
                </Button>
            )}
        </div>
    </Popup>
}
