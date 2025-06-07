import React from "react";
import DrawContext from "./DrawContext";
import DrawControls from "./DrawControls";
import TrackLayer from "./TrackLayer";

export default function () {
    return <DrawContext>
        <DrawControls />
        {/* <TrackLayer /> */}
    </DrawContext>
}
