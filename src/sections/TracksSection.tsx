import React, { useMemo, useRef } from "react";
import Section from "./Section";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../caches/indexeddb";
import Card from "../components/Card";
import Button from "../components/Button";
import { useParams, useRouteUpdater } from "../routing/router";
import { Track } from "../tracks/track";
import { getLineLength } from "../utils/distance";
import { importGPXFile } from "../utils/importGPX";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importGPXFile(file);

      // Save all imported tracks
      for (const track of result.tracks) {
        await db.updateTrack(track);
      }

      // Also save points if any
      for (const point of result.points) {
        await db.updatePoint(point);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      const message = [];
      if (result.tracks.length > 0)
        message.push(`${result.tracks.length} track(s)`);
      if (result.points.length > 0)
        message.push(`${result.points.length} point(s)`);
      alert(`Successfully imported ${message.join(" and ")}`);
    } catch (error) {
      alert(`Failed to import GPX: ${error instanceof Error ? error.message : "Unknown error"}`);
      console.error(error);
    }
  };

  return (
    <Section closable page="tracks" title="Tracks">
      <div className="flex gap-2">
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
        <Button onClick={() => fileInputRef.current?.click()}>
          Import GPX
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx"
          onChange={handleFileImport}
          style={{ display: "none" }}
        />
      </div>
      <ul className="flex flex-col gap-2 mt-2">
        {tracks.map((t) => (
          <TrackCard key={t.id} track={t} />
        ))}
      </ul>
    </Section>
  );
}
