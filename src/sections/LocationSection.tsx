import React, { useEffect, useState } from "react";
import { useRouteUpdater } from "../routing/router";
import { useMap } from "../map/Map";
import { getElevation } from "../layers/contours";
import { closestPlace, findPlace } from "../search/nearest";
import { getPlaces } from "../search/places";
import db from "../caches/indexeddb";
import { Point } from "../tracks/point";
import round from "../utils/round";
import StatusBarButton from "../components/StatusBarButton";
import { shareLocation } from "../utils/share";
import Section from "./Section";
import { usePromise } from "../hooks/usePromise";
import { getMountains, Mountain, MountainPitch } from "../layers/mountains";
import { getHutByName, Hut } from "../layers/huts";
import TopoText from "../components/TopoText";
import { repeatString } from "../utils/array";
import ImageGallery from "../components/ImageGallery";

const joinBits = (bits: (string | number | boolean | null | undefined)[]) => bits
    .filter(b => b)
    .join(' ');

function Pitches({ pitches }: { pitches: MountainPitch[] }) {
  const isOnly = pitches.length === 1;
  const className = !isOnly ? 'list-decimal ml-8' : '';
  return <ol className={className}>
    {pitches.map((p, i) => <li key={i}>
      {!isOnly && joinBits([
        p.ewbank,
        p.alpine ?? p.mtcook,
        p.commitment,
        p.aid,
        p.ice,
        p.mixed,
        p.length && `(${p.length})`,
        p.bolts && `${p.bolts} bolts`,
        ' '
      ])}<TopoText text={p.description} />
    </li>)}
  </ol>;
}

function LocationInfo({ lat, lng, name }: { lat: number; lng: number; name?: string }) {
  const updateRoute = useRouteUpdater();
  const { map } = useMap();
  const [elevation, setElevation] = useState<number | null>(null);
  const [place, setPlace] = useState<any | null>(null);
  const [existingPoint, setExistingPoint] = useState<Point | null>(null);
  const [hut, setHut] = useState<Hut | null>(null);
  const { result: mountains = {} } = usePromise(getMountains, []);

  // Fetch location info
  useEffect(() => {
    if (!map) return;

    const zoom = map.getZoom();

    Promise.all([
      // Check for saved point
      db.findPointByCoordinates(lng, lat).catch(() => null),
      // Find underlying place (mountain, hut, etc.) excluding saved points
      getPlaces().then(places => closestPlace(lat, lng, places, 0.1)).catch(() => null),
    ])
      .then(([point, underlyingPlace]) => {
        const placeLat = underlyingPlace ? parseFloat(underlyingPlace.lat) : lat;
        const placeLng = underlyingPlace ? parseFloat(underlyingPlace.lon) : lng;

        return Promise.all([
          getElevation([placeLat, placeLng], zoom).catch(() => null),
          Promise.resolve(underlyingPlace ?? (name ? { name } : null)),
          Promise.resolve(point),
        ]);
      })
      .then(([elevationValue, placeData, point]) => {
        setElevation(elevationValue);
        setPlace(placeData);
        setExistingPoint(point);

        // Fetch full hut details if this is a hut
        if (placeData?.type === "hut" && placeData?.name) {
          getHutByName(placeData.name).then(hutData => {
            setHut(hutData);
          });
        } else {
          setHut(null);
        }
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
    <div className="flex flex-col gap-4 relative">
      <button
        onClick={() => updateRoute({ page: null })}
        className="absolute w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700"
        style={{ top: '-0.5rem', right: '-0.5rem' }}
      >
        ✕
      </button>
      <div className="flex items-start justify-between pr-8">
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

      {isHut && hut && (
        <div>
          {/* Hero image */}
          {(hut.heroImage || hut.introductionThumbnail) && (
            <img
              className="h-64 w-full object-cover object-center mb-4"
              alt={hut.name}
              src={hut.heroImage || hut.introductionThumbnail}
            />
          )}
          {(hut.webcamUrl || hut.webcamUrls) && (
            <div className="mb-4">
              <h5 className="font-semibold mb-2">
                {hut.webcamUrls && hut.webcamUrls.length > 1 ? 'Live Webcams' : 'Live Webcam'}
              </h5>
              {hut.webcamUrl && (
                <img
                  className="w-full object-contain border border-gray-300"
                  alt={`${hut.name} webcam`}
                  src={hut.webcamUrl}
                />
              )}
              {hut.webcamUrls && hut.webcamUrls.map((url, i) => (
                <img
                  key={i}
                  className="w-full object-contain border border-gray-300 mt-2"
                  alt={`${hut.name} webcam ${i + 1}`}
                  src={url}
                />
              ))}
            </div>
          )}
          {hut.introduction && (
            <div className="mb-4">
              <TopoText text={hut.introduction} />
            </div>
          )}
          {hut.hutCategory && (
            <div className="mb-2">
              <span className="font-bold">Category: </span>
              <span>{hut.hutCategory}</span>
            </div>
          )}
          {hut.numberOfBunks && (
            <div className="mb-2">
              <span className="font-bold">Bunks: </span>
              <span>{hut.numberOfBunks}</span>
            </div>
          )}
          {hut.bookable !== undefined && (
            <div className="mb-2">
              <span className="font-bold">Bookable: </span>
              <span>{hut.bookable ? "Yes" : "No"}</span>
            </div>
          )}
          {hut.proximityToRoadEnd && (
            <div className="mb-2">
              <span className="font-bold">Distance from road: </span>
              <span>{hut.proximityToRoadEnd}</span>
            </div>
          )}
          {hut.facilities && hut.facilities.length > 0 && (
            <div className="mb-2">
              <span className="font-bold">Facilities:</span>
              <ul className="list-disc ml-6 mt-1">
                {hut.facilities.map((facility, i) => (
                  <li key={i}>{facility}</li>
                ))}
              </ul>
            </div>
          )}
          {hut.place && (
            <div className="mb-2">
              <span className="font-bold">Location: </span>
              <span>{hut.place}</span>
            </div>
          )}
          {/* Gallery images */}
          {hut.gallery && hut.gallery.length > 0 && (() => {
            const galleryImages = hut.gallery.map((image, i) => {
              // Strip HTML tags and decode entities from caption
              const cleanCaption = image.caption
                ? image.caption
                    .replace(/<[^>]*>/g, '') // Remove HTML tags
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
                    .trim()
                : undefined;

              return {
                url: image.url,
                alt: cleanCaption || `${hut.name} photo ${i + 1}`,
                caption: cleanCaption,
              };
            });

            return <ImageGallery images={galleryImages} className="mb-4" />;
          })()}
          {hut.staticLink && (
            <div className="mt-4">
              <a
                href={hut.staticLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View on DOC website
              </a>
            </div>
          )}
        </div>
      )}

      {isMountain && mountain && (
        <>
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
                  <React.Fragment key={r.link}>
                    <hr className="my-1" />
                    <div className="my-2">
                      <div className="font-bold">
                        {joinBits([
                          r.name,
                          r.grade && `(${r.grade})`,
                          r.bolts && `${r.bolts} bolts`,
                          r.natural_pro && 'trad',
                          repeatString('★', r.quality)
                        ])}
                      </div>
                      {r.image && (
                        <a target="_blank" rel="noopener noreferrer" href={r.image}>
                          <img
                            className="h-64 w-full object-cover object-scale"
                            alt={r.name}
                            src={r.image}
                          />
                        </a>
                      )}
                      <div>
                        <TopoText text={r.description ?? ''} />
                      </div>
                      <Pitches pitches={r.pitches} />
                      {r.ascent && (
                        <span className="italic">
                          F.A. {r.ascent}
                        </span>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
          {mountain.places.map((place) => (
            <React.Fragment key={place.link}>
              <hr className="my-3" />
              <div>
                <h4 className="font-bold text-md">{place.name}{place.altitude && ` (${place.altitude})`}</h4>
                {place.image && (
                  <a target="_blank" href={place.image} rel="noopener noreferrer">
                    <img className="h-64 w-full object-cover object-top" alt={place.name} src={place.image} />
                  </a>
                )}
                {place.access && (
                  <>
                    <span className="font-bold">Access</span>
                    <p>
                      <TopoText text={place.access} />
                    </p>
                  </>
                )}
                {place.description && (
                  <>
                    <span className="font-bold">Description</span>
                    <p>
                      <TopoText text={place.description} />
                    </p>
                  </>
                )}
                {!!place.routes.length && (
                  <>
                    <span className="font-bold">Routes</span>
                    {place.routes.map((r) => (
                      <React.Fragment key={r.link}>
                        <hr className="my-1" />
                        <div className="my-2">
                          <div className="font-bold">
                            {joinBits([
                              r.name,
                              r.grade && `(${r.grade})`,
                              r.bolts && `${r.bolts} bolts`,
                              r.natural_pro && 'trad',
                              repeatString('★', r.quality)
                            ])}
                          </div>
                          {r.image && (
                            <a target="_blank" rel="noopener noreferrer" href={r.image}>
                              <img
                                className="h-64 w-full object-cover object-scale"
                                alt={r.name}
                                src={r.image}
                              />
                            </a>
                          )}
                          <div>
                            <TopoText text={r.description ?? ''} />
                          </div>
                          <Pitches pitches={r.pitches} />
                          {r.ascent && (
                            <span className="italic">
                              F.A. {r.ascent}
                            </span>
                          )}
                        </div>
                      </React.Fragment>
                    ))}
                  </>
                )}
              </div>
            </React.Fragment>
          ))}
          <div>
            <a href={mountain.link} title={mountain.name} target="_blank" rel="noopener noreferrer">
              ClimbNZ
            </a>
          </div>
        </>
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
