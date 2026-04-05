import React, { useMemo, useRef, useState } from "react";
import Section from "./Section";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../caches/indexeddb";
import Card from "../components/Card";
import Button from "../components/Button";
import { useRouteUpdater } from "../routing/router";
import { Track } from "../tracks/track";
import { getLineLength } from "../utils/distance";
import { buildFullCoordinates } from "../tracks/trackUtils";
import { importGPXFile } from "../utils/importGPX";
import { randomColor } from "../utils/randomColor";

function TrackCard({ track }: { track: Track }) {
  const updateRoute = useRouteUpdater();
  const distance = useMemo(() => getLineLength(buildFullCoordinates(track)), [track.coordinates, track.routedSegments]);

  return (
    <Card onClick={() => updateRoute({ page: `track/${track.id}` })}>
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: track.color ?? "#3b82f6" }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">
            {track.name ?? `Untitled Track ${track.id}`}
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({distance.toFixed(2)} km)
            </span>
          </h3>
          {(track.tags ?? []).length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {track.tags!.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function TracksSection() {
  const tracks = useLiveQuery(() => db.getTracks(), []) ?? [];
  const updateRoute = useRouteUpdater();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filterTag, setFilterTag] = useState("");

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tracks.forEach(t => (t.tags ?? []).forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    if (!filterTag) return tracks;
    return tracks.filter(t => (t.tags ?? []).includes(filterTag));
  }, [tracks, filterTag]);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importGPXFile(file);
      for (const track of result.tracks) await db.updateTrack(track);
      for (const point of result.points) await db.updatePoint(point);
      if (fileInputRef.current) fileInputRef.current.value = "";
      const message = [];
      if (result.tracks.length > 0) message.push(`${result.tracks.length} track(s)`);
      if (result.points.length > 0) message.push(`${result.points.length} point(s)`);
      alert(`Successfully imported ${message.join(" and ")}`);
    } catch (error) {
      alert(`Failed to import GPX: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <Section closable page="tracks" title="Tracks">
      <div className="flex gap-2">
        <Button
          onClick={async () => {
            const track = await db.updateTrack({ coordinates: [], color: randomColor() });
            updateRoute({ page: `track/${track.id}`, editingFeature: track.id! });
          }}
        >
          Create Track
        </Button>
        <Button onClick={() => fileInputRef.current?.click()}>Import GPX</Button>
        <input ref={fileInputRef} type="file" accept=".gpx" onChange={handleFileImport} style={{ display: "none" }} />
      </div>

      {allTags.length > 0 && (
        <div className="mt-2">
          <label className="text-sm text-gray-600">Filter by tag:</label>
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="ml-2 px-2 py-1 border rounded">
            <option value="">All tags</option>
            {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </div>
      )}

      <ul className="flex flex-col gap-2 mt-2">
        {filteredTracks.map(t => <TrackCard key={t.id} track={t} />)}
      </ul>
    </Section>
  );
}
