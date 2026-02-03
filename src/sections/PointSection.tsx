import React, { useState, useEffect } from "react";
import Section from "./Section";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../caches/indexeddb";
import Button from "../components/Button";
import { useParams, useRouteUpdater } from "../routing/router";

export default function PointSection() {
  const params = useParams();
  const updateRoute = useRouteUpdater();
  const [newTag, setNewTag] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Extract point ID from page parameter (e.g., "point/123")
  const pointId = params.page?.startsWith("point/")
    ? parseInt(params.page.split("/")[1])
    : null;

  const point = useLiveQuery(
    () => (pointId ? db.getPoint(pointId) : undefined),
    [pointId],
  );

  // Initialize local state when point loads
  useEffect(() => {
    if (point) {
      setName(point.name ?? "");
      setDescription(point.description ?? "");
    }
  }, [point?.id]);

  if (!pointId || !point) return null;

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTag.trim()) {
      const tag = newTag.trim();
      if (!point.tags.includes(tag)) {
        db.updatePoint({ ...point, tags: [...point.tags, tag] });
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    db.updatePoint({
      ...point,
      tags: point.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleDelete = () => {
    if (window.confirm("Delete this point?")) {
      db.deletePoint(point);
      updateRoute({ page: "points" });
    }
  };

  return (
    <Section backButton page={`point/${pointId}`} title="Edit Point">
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Color</label>
          <input
            type="color"
            value={point.color ?? "#3b82f6"}
            onChange={(e) => db.updatePoint({ ...point, color: e.target.value })}
            className="w-full h-12 cursor-pointer"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Name</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={name}
            placeholder={`Untitled Point ${point.id}`}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => db.updatePoint({ ...point, name: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">
            Description
          </label>
          <textarea
            className="w-full border rounded p-2"
            placeholder="Add description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={(e) => db.updatePoint({ ...point, description: e.target.value })}
            rows={4}
          />
        </div>

        <div>
          <label className="text-sm text-gray-600 block mb-1">Tags</label>
          <div className="flex gap-1 flex-wrap mb-2">
            {point.tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded flex items-center gap-1"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add tag and press Enter..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleAddTag}
            className="w-full text-sm px-2 py-1 border rounded"
          />
        </div>

        <div>
          <Button onClick={handleDelete}>Delete Point</Button>
        </div>
      </div>
    </Section>
  );
}
