import React, { useMemo, useState } from "react";
import Section from "./Section";
import { useLiveQuery } from "dexie-react-hooks";
import db from "../caches/indexeddb";
import Card from "../components/Card";
import { Point } from "../tracks/point";
import { useRouteUpdater } from "../routing/router";

function PointCard({ point, onClick }: { point: Point; onClick: () => void }) {
  return (
    <Card onClick={onClick}>
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: point.color ?? "#3b82f6" }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">
            {point.name ?? `Untitled Point ${point.id}`}
          </h3>
          {point.description && (
            <p className="text-sm text-gray-600 truncate">{point.description}</p>
          )}
          {point.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {point.tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded"
                >
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

export default function PointsSection() {
  const points = useLiveQuery(() => db.getPoints(), []) ?? [];
  const [filterTag, setFilterTag] = useState<string>("");
  const updateRoute = useRouteUpdater();

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    points.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [points]);

  // Filter points by tag
  const filteredPoints = useMemo(() => {
    if (!filterTag) return points;
    return points.filter((p) => p.tags.includes(filterTag));
  }, [points, filterTag]);

  const handleOpenPoint = (point: Point) => {
    updateRoute({ page: `point/${point.id}` });
  };

  return (
    <Section closable page="points" title="Points">

      {allTags.length > 0 && (
        <div className="mt-2">
          <label className="text-sm text-gray-600">Filter by tag:</label>
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="ml-2 px-2 py-1 border rounded"
          >
            <option value="">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      )}

      <ul className="flex flex-col gap-2 mt-2">
        {filteredPoints.map((p) => (
          <PointCard key={p.id} point={p} onClick={() => handleOpenPoint(p)} />
        ))}
      </ul>
    </Section>
  );
}
