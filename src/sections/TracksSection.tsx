import React, { useMemo } from "react";
import Section from "./Section";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../caches/indexeddb";
import Card from "../components/Card";
import Button from "../components/Button";
import { useParams, useRouteUpdater } from "../routing/router";
import { Track } from "../tracks/track";
import { getLineLength } from "../utils/distance";

function TrackCard({ track }: { track: Track }) {
  const updateRoute = useRouteUpdater();
  const { editingFeature } = useParams();
  const isEditing = editingFeature === track.id;
  const distance = useMemo(
    () => getLineLength(track.coordinates),
    [track.coordinates],
  );
  return (
    <Card onClick={() => updateRoute({ editingFeature: track.id })}>
      <h2 className="flex justify-between items-center">
        <input
          className={`flex-1 ${isEditing && "text-blue-500 underline"}`}
          value={track.name ?? `Untitled Track ${track.id}`}
          onChange={(e) => db.updateTrack({ ...track, name: e.target.value })}
        />
        <span className="flex gap-2 items-center">
          ({distance.toFixed(2)}km)
          <Button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Delete track?")) {
                if (isEditing) {
                  updateRoute({ editingFeature: null });
                }
                db.deleteTrack(track);
              }
            }}
          >
            🗑
          </Button>
        </span>
      </h2>
    </Card>
  );
}

export default function TracksSection() {
  const tracks = useLiveQuery(() => db.getTracks(), []) ?? [];
  const updateRoute = useRouteUpdater();
  return (
    <Section closable page="tracks" title="Tracks">
      <Button
        onClick={async () => {
          const track = await db.updateTrack({
            coordinates: [],
          });

          updateRoute({
            editingFeature: track.id!,
          });
        }}
      >
        Create Track
      </Button>
      <ul className="flex flex-col gap-2 mt-2">
        {tracks.map((t) => (
          <TrackCard key={t.id} track={t} />
        ))}
      </ul>
    </Section>
  );
}
