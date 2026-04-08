import React, { useState, useEffect } from "react";
import Section from "./Section";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../caches/indexeddb";
import Button from "../components/Button";
import { useParams, useRouteUpdater } from "../routing/router";
import ElevationChart from "../components/ElevationChart";
import { exportGPX, downloadGPX } from "../utils/exportGPX";

export default function TrackSection() {
  const params = useParams();
  const updateRoute = useRouteUpdater();
  const [newTag, setNewTag] = useState("");
  const [name, setName] = useState("");

  const trackId = params.page?.startsWith("track/")
    ? parseInt(params.page.split("/")[1])
    : null;

  const track = useLiveQuery(
    () => (trackId ? db.getTrack(trackId) : undefined),
    [trackId],
  );

  useEffect(() => {
    if (track) setName(track.name ?? "");
  }, [track?.id]);

  if (!trackId || !track) return null;

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTag.trim()) {
      const tag = newTag.trim();
      if (!(track.tags ?? []).includes(tag)) {
        db.updateTrack({ ...track, tags: [...(track.tags ?? []), tag] });
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    db.updateTrack({ ...track, tags: (track.tags ?? []).filter(t => t !== tagToRemove) });
  };

  const handleDelete = () => {
    if (window.confirm("Delete this track?")) {
      if (params.editingFeature === trackId) updateRoute({ editingFeature: null, page: "tracks" });
      else updateRoute({ page: "tracks" });
      db.deleteTrack(track);
    }
  };

  return (
    <Section backButton page={`track/${trackId}`} title="Edit Track">
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Color</label>
          <input
            type="color"
            value={track.color ?? "#3b82f6"}
            onChange={e => db.updateTrack({ ...track, color: e.target.value })}
            className="w-full h-12 cursor-pointer"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Name</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={name}
            placeholder={`Untitled Track ${track.id}`}
            onChange={e => setName(e.target.value)}
            onBlur={e => db.updateTrack({ ...track, name: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Tags</label>
          <div className="flex gap-1 flex-wrap mb-2">
            {(track.tags ?? []).map((tag, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded flex items-center gap-1">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="hover:text-blue-900">×</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add tag and press Enter..."
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={handleAddTag}
            className="w-full text-sm px-2 py-1 border rounded"
          />
        </div>

        {track.coordinates.length >= 2 && (
          <div>
            <label className="text-sm text-gray-600 block mb-1">Elevation Profile</label>
            <ElevationChart track={track} />
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={() => updateRoute({ editingFeature: trackId })}>Edit Track</Button>
          <Button onClick={() => downloadGPX(exportGPX([track], []), `${track.name ?? `track-${track.id}`}.gpx`)}>Export GPX</Button>
          <Button onClick={handleDelete}>Delete Track</Button>
        </div>
      </div>
    </Section>
  );
}
