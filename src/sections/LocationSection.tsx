import React, { useEffect, useState } from "react";
import { useParams, useRouteUpdater } from "../routing/router";
import { useMap } from "../map/Map";
import { getElevation } from "../layers/contours";
import { findPlace } from "../search/nearest";
import db from "../caches/indexeddb";
import { Point } from "../tracks/point";
import round from "../utils/round";
import StatusBarButton from "../components/StatusBarButton";
import { shareLocation } from "../utils/share";

function LocationInfo() {
  const params = useParams();
  const updateRoute = useRouteUpdater();
  const { map } = useMap();
  const [elevation, setElevation] = useState<number | null>(null);
  const [place, setPlace] = useState<any | null>(null);
  const [existingPoint, setExistingPoint] = useState<Point | null>(null);

  const hasLocation = params.lla !== null && params.llo !== null;
  const position = hasLocation ? { lat: params.lla!, lng: params.llo! } : null;

  // Fetch location info
  useEffect(() => {
    if (!position || !map) return;

    const zoom = map.getZoom();

    findPlace(position.lat, position.lng)
      .catch(() => null)
      .then((placeData) => {
        const lat = placeData ? parseFloat(placeData.lat) : position.lat;
        const lng = placeData ? parseFloat(placeData.lon) : position.lng;

        return Promise.all([
          getElevation([lat, lng], zoom).catch(() => null),
          Promise.resolve(placeData),
          db.findPointByCoordinates(lng, lat).catch(() => null),
        ]);
      })
      .then(([elevationValue, placeData, point]) => {
        setElevation(elevationValue);
        setPlace(placeData ?? (params.lab ? { name: params.lab } : null));
        setExistingPoint(placeData?.type === "point" ? placeData : point);
      });
  }, [position?.lat, position?.lng, map, params.lab]);

  const isMountain = place?.type === "peak" && place?.href;

  const handlePlaceClick = () => {
    if (isMountain && place?.href) {
      updateRoute({
        page: `mountain/${encodeURIComponent(place.href)}`,
      });
    }
  };

  const handleSavePoint = async () => {
    if (!position) return;

    const baseNameFromPlace = place?.name?.replace(/\s*\(\d+m\)\s*$/, "") || null;
    const placeName = baseNameFromPlace
      ? `${baseNameFromPlace} (${round(elevation || 0, 0)}m)`
      : `${round(position.lat, 6)}, ${round(position.lng, 6)}`;

    const point = await db.updatePoint({
      coordinates: [position.lng, position.lat],
      tags: [],
      name: placeName,
      color: "#3b82f6",
    });

    setExistingPoint(place ? { ...place, type: "point" } : ({ name: placeName, type: "point" } as any));
  };

  const handleEditPoint = async () => {
    if (!existingPoint || !position) return;

    const point = await db.findPointByCoordinates(position.lng, position.lat);
    if (point) {
      updateRoute({
        page: `point/${point.id}`,
      });
    }
  };

  const handleRemovePoint = async () => {
    if (!existingPoint || !position) return;

    const point = await db.findPointByCoordinates(position.lng, position.lat);
    if (point) {
      await db.deletePoint(point);
      setExistingPoint(null);
      const underlyingPlace = await findPlace(position.lat, position.lng).catch(() => null);
      setPlace(underlyingPlace);
    }
  };

  const handleShare = async () => {
    const title = place?.name || "Location";
    await shareLocation(title);
  };

  return (
    <div className="font-semibold whitespace-nowrap text-center flex items-center justify-center gap-2 flex-wrap">
      {isMountain ? (
        <button
          className="text-blue-600 hover:text-blue-800 underline pointer-events-auto"
          onClick={handlePlaceClick}
        >
          {place?.name ?? "Unknown Point"}
        </button>
      ) : (
        <span>{place?.name ?? "Unknown Point"}</span>
      )}
      <div className="flex gap-1 pointer-events-auto">
        {isMountain && (
          <StatusBarButton onClick={handlePlaceClick} title="View routes">
            🧗 Routes
          </StatusBarButton>
        )}
        {existingPoint && (
          <StatusBarButton onClick={handleEditPoint} title="Edit point">
            ✏️
          </StatusBarButton>
        )}
        <StatusBarButton
          onClick={existingPoint ? handleRemovePoint : handleSavePoint}
          title={existingPoint ? "Remove saved point" : "Save point"}
        >
          {existingPoint ? <span style={{ color: "#fbbf24" }}>★</span> : "☆"}
        </StatusBarButton>
        <StatusBarButton onClick={handleShare} title="Share location">
          🔗
        </StatusBarButton>
      </div>
    </div>
  );
}

export default function LocationSection() {
  const params = useParams();

  const hasLocation = params.lla !== null && params.llo !== null && params.page === null;

  if (!hasLocation) return null;

  return (
    <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 pointer-events-none z-10">
      <div className="bg-white bg-opacity-90 text-black text-xs px-3 py-2 rounded pointer-events-auto">
        <LocationInfo />
      </div>
    </div>
  );
}
