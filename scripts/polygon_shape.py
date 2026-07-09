"""
Polygon shape analysis for label placement: finds the largest circle that fits
inside a polygon (the "pole of inaccessibility", the same problem Mapbox's
`polylabel` solves), and - for elongated shapes where that circle is too small
relative to the polygon's length - an approximate medial axis (skeleton)
running down the middle, for line-following text instead of a point label.

No external geometry library is used (shapely/polylabel aren't installed
here); both are built on top of a Voronoi diagram of densified boundary
points, which is a standard, well-understood approximation:

- A Voronoi vertex that falls inside the polygon is equidistant from the
  boundary points that generated it, so that distance is the radius of the
  largest circle centred there that doesn't cross the boundary. The internal
  vertex with the largest such radius approximates polylabel's answer.
- The internal Voronoi vertices and the edges between adjacent ones form an
  approximate medial axis. Its longest path (found the standard way two BFS/
  Dijkstra passes find a tree's diameter) approximates the polygon's spine.

Boundary points need to be dense relative to the polygon's local curvature
for either of these to be accurate, hence densify_ring below.
"""

import math

import numpy as np
from scipy.spatial import Voronoi, cKDTree
import networkx as nx


def project_ring(ring):
    """Project a lon/lat ring to local equirectangular km coordinates."""
    lons = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    lon0 = sum(lons) / len(lons)
    lat0 = sum(lats) / len(lats)
    cos_lat = math.cos(math.radians(lat0))

    def to_km(pt):
        return ((pt[0] - lon0) * 111.32 * cos_lat, (pt[1] - lat0) * 110.57)

    return [to_km(p) for p in ring], lon0, lat0, cos_lat


def unproject_point(xy, lon0, lat0, cos_lat):
    x, y = xy
    return [lon0 + x / (111.32 * cos_lat), lat0 + y / 110.57]


def point_in_ring(point, ring):
    """Standard ray-casting point-in-polygon test."""
    x, y = point
    inside = False
    n = len(ring)
    x1, y1 = ring[-1]
    for i in range(n):
        x2, y2 = ring[i]
        if ((y1 > y) != (y2 > y)) and (x < (x2 - x1) * (y - y1) / (y2 - y1) + x1):
            inside = not inside
        x1, y1 = x2, y2
    return inside


def densify_ring(ring, max_segment):
    """Insert extra points along any edge longer than max_segment."""
    out = []
    n = len(ring)
    for i in range(n):
        p1 = ring[i]
        p2 = ring[(i + 1) % n]
        out.append(p1)
        seg_len = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        steps = int(seg_len // max_segment)
        for s in range(1, steps + 1):
            t = s / (steps + 1)
            out.append((p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t))
    return out


def medial_axis(ring_xy, target_segment):
    """
    Returns (graph, radii) where graph is a networkx Graph of internal Voronoi
    vertices (node data holds the xy position) connected by edges weighted by
    euclidean distance, and radii maps node -> locally-inscribed circle radius.
    """
    boundary = densify_ring(ring_xy, target_segment)
    points = np.array(boundary)
    if len(points) < 4:
        return nx.Graph(), {}

    vor = Voronoi(points)
    tree = cKDTree(points)

    internal = {}
    for idx, vertex in enumerate(vor.vertices):
        if not point_in_ring(vertex, ring_xy):
            continue
        radius, _ = tree.query(vertex)
        internal[idx] = (tuple(vertex), float(radius))

    graph = nx.Graph()
    for idx, (xy, radius) in internal.items():
        graph.add_node(idx, xy=xy, radius=radius)

    for a, b in vor.ridge_vertices:
        if a in internal and b in internal:
            xy_a, _ = internal[a]
            xy_b, _ = internal[b]
            weight = math.hypot(xy_a[0] - xy_b[0], xy_a[1] - xy_b[1])
            graph.add_edge(a, b, weight=weight)

    radii = {idx: r for idx, (_, r) in internal.items()}
    return graph, radii


def largest_inscribed_circle(graph, radii, ring_xy):
    """Approximates polylabel: returns (center_xy, radius_km), or (centroid, 0) if degenerate."""
    if not radii:
        cx = sum(p[0] for p in ring_xy) / len(ring_xy)
        cy = sum(p[1] for p in ring_xy) / len(ring_xy)
        return (cx, cy), 0.0

    best_node = max(radii, key=radii.get)
    return graph.nodes[best_node]['xy'], radii[best_node]


def longest_path(graph):
    """
    Standard tree-diameter algorithm (two shortest-path passes) approximating
    the medial axis's spine from one end of the polygon to the other. Works
    as a reasonable approximation even when the graph isn't a perfect tree.
    Returns a list of xy points in order along the path, or [] if too small.
    """
    if graph.number_of_nodes() < 2:
        return []

    components = list(nx.connected_components(graph))
    largest_component = max(components, key=len)
    subgraph = graph.subgraph(largest_component)
    if subgraph.number_of_nodes() < 2:
        return []

    start = next(iter(subgraph.nodes))
    lengths = nx.single_source_dijkstra_path_length(subgraph, start, weight='weight')
    a = max(lengths, key=lengths.get)

    lengths_from_a = nx.single_source_dijkstra_path_length(subgraph, a, weight='weight')
    b = max(lengths_from_a, key=lengths_from_a.get)

    path = nx.dijkstra_path(subgraph, a, b, weight='weight')
    return [subgraph.nodes[n]['xy'] for n in path]
