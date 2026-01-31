import React, { useEffect, useState } from "react";
import { useRouteUpdater } from "../routing/router";
import { useMap } from "../map/Map";
import { getElevation } from "../layers/contours";
import { findPlace } from "../search/nearest";
import db from "../caches/indexeddb";
import { Point } from "../tracks/point";
import round from "../utils/round";
import StatusBarButton from "../components/StatusBarButton";
import { shareLocation } from "../utils/share";
import Section from "./Section";
import { usePromise } from "../hooks/usePromise";
import { getMountains, Mountain } from "../layers/mountains";
import TopoText from "../components/TopoText";

function LocationInfo({ lat, lng, name }: { lat: number; lng: number; name?: string }) {
  const updateRoute = useRouteUpdater();
  const { map } = useMap();
  const [elevation, setElevation] = useState<number | null>(null);
  const [place, setPlace] = useState<any | null>(null);
  const [existingPoint, setExistingPoint] = useState<Point | null>(null);
  const { result: mountains = {} } = usePromise(getMountains, []);

  // Fetch location info
  useEffect(() => {
    if (!map) return;

    const zoom = map.getZoom();

    findPlace(lat, lng)
      .catch(() => null)
      .then((placeData) => {
        const placeLat = placeData ? parseFloat(placeData.lat) : lat;
        const placeLng = placeData ? parseFloat(placeData.lon) : lng;

        return Promise.all([
          getElevation([placeLat, placeLng], zoom).catch(() => null),
          Promise.resolve(placeData),
          db.findPointByCoordinates(placeLng, placeLat).catch(() => null),
        ]);
      })
      .then(([elevationValue, placeData, point]) => {
        setElevation(elevationValue);
        setPlace(placeData ?? (name ? { name } : null));
        setExistingPoint(placeData?.type === "point" ? placeData : point);
      });
  }, [lat, lng, map, name]);

  const isHut = place?.type === "hut";
  const isMountain = place?.type === "peak" && place?.href;
  const mountain = isMountain && place?.href ? (mountains[place.href] as Mountain | undefined) : null;

  const handleSavePoint = async () => {
    const baseNameFromPlace = place?.name?.replace(/\s*\(\d+m\)\s*$/, "") || null;
    const placeName = baseNameFromPlace
      ? `${baseNameFromPlace} (${round(elevation || 0, 0)}m)`
      : `${round(lat, 6)}, ${round(lng, 6)}`;

    await db.updatePoint({
      coordinates: [lng, lat],
      tags: [],
      name: placeName,
      color: "#3b82f6",
    });

    const point = await db.findPointByCoordinates(lng, lat);
    setExistingPoint(point);
  };

  const handleEditPoint = async () => {
    const point = await db.findPointByCoordinates(lng, lat);
    if (point) {
      updateRoute({
        page: `point/${point.id}`,
      });
    }
  };

  const handleRemovePoint = async () => {
    const point = await db.findPointByCoordinates(lng, lat);
    if (point) {
      await db.deletePoint(point);
      setExistingPoint(null);
      const underlyingPlace = await findPlace(lat, lng).catch(() => null);
      setPlace(underlyingPlace);
    }
  };

  const handleShare = async () => {
    const title = place?.name || "Location";
    const locationPath = place?.name
      ? `location/${lat}/${lng}/${encodeURIComponent(place.name)}`
      : `location/${lat}/${lng}`;
    const url = `${window.location.origin}${window.location.pathname}#page=${locationPath}&lat=${lat}&lon=${lng}`;
    await shareLocation(title, url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <h3 className="font-bold text-lg">{place?.name ?? "Location"}</h3>
          <div className="text-xs text-gray-500">
            {round(lat, 6)}, {round(lng, 6)}
            {elevation !== null && <span> • {round(elevation, 0)}m</span>}
          </div>
        </div>
        <div className="flex gap-2">
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

      {isHut && place?.description && (
        <div>
          <TopoText text={place.description} />
        </div>
      )}

      {isMountain && mountain && (
        <div>
          {mountain.image && (
            <a target="_blank" href={mountain.image} rel="noopener noreferrer">
              <img className="h-64 w-full object-cover object-top" alt={mountain.name} src={mountain.image} />
            </a>
          )}
          {mountain.access && (
            <>
              <span className="font-bold">Access</span>
              <p>
                <TopoText text={mountain.access} />
              </p>
            </>
          )}
          {mountain.description && (
            <>
              <span className="font-bold">Description</span>
              <p>
                <TopoText text={mountain.description} />
              </p>
            </>
          )}
          {!!mountain.routes.length && (
            <>
              <span className="font-bold">Routes</span>
              {mountain.routes.map((r) => (
                <div key={r.link} className="my-2">
                  <div className="font-semibold">{r.name}</div>
                  {r.grade && <div className="text-sm text-gray-600">{r.grade}</div>}
                  {r.description && (
                    <div className="text-sm">
                      <TopoText text={r.description} />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          <div>
            <a href={mountain.link} title={mountain.name} target="_blank" rel="noopener noreferrer">
              ClimbNZ
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LocationSection() {
  return (
    <Section page="location/:lat/:lng/:name?">
      {({ lat, lng, name }) => (
        <LocationInfo lat={parseFloat(lat)} lng={parseFloat(lng)} name={name} />
      )}
    </Section>
  );
}
