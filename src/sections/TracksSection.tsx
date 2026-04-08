import React, { useMemo, useState } from "react";
import Section from "./Section";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../caches/indexeddb";
import Card from "../components/Card";
import { useRouteUpdater } from "../routing/router";
import { Track } from "../tracks/track";
import { getLineLength } from "../utils/distance";
import { buildFullCoordinates } from "../tracks/trackUtils";

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

  return (
    <Section closable page="tracks" title="Tracks">
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
