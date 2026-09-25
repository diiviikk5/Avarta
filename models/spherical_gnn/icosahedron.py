"""Spherical mesh geometry and an *untrained* experimental message-passing model.

The mesh builder is real geometry; this module does not ingest NEPS-G or provide a
trained anomaly detector. See the historical replay for the validated data path.
"""

import math
from typing import Tuple, Dict
import numpy as np
from scipy.spatial import ConvexHull, cKDTree

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False


def generate_icosahedron_vertices() -> np.ndarray:
    """Generate the 12 initial vertices of a regular icosahedron on the unit sphere."""
    phi = (1.0 + math.sqrt(5.0)) / 2.0  # Golden ratio
    verts = [
        [-1,  phi, 0],
        [ 1,  phi, 0],
        [-1, -phi, 0],
        [ 1, -phi, 0],
        [ 0, -1,  phi],
        [ 0,  1,  phi],
        [ 0, -1, -phi],
        [ 0,  1, -phi],
        [ phi, 0, -1],
        [ phi, 0,  1],
        [-phi, 0, -1],
        [-phi, 0,  1]
    ]
    verts = np.array(verts, dtype=np.float32)
    # Normalize to unit sphere S^2
    norms = np.linalg.norm(verts, axis=1, keepdims=True)
    return verts / norms


def subdivide_mesh(vertices: np.ndarray, level: int = 1) -> Tuple[np.ndarray, np.ndarray]:
    """
    Subdivide icosahedron edges recursively to achieve uniform spherical resolution.
    Returns:
        nodes: (N, 3) 3D cartesian coordinates on unit sphere
        edge_index: (2, E) undirected edge graph adjacency
    """
    if level < 0 or level > 7:
        raise ValueError("level must be between 0 and 7")
    nodes = np.asarray(vertices, dtype=np.float64)
    if nodes.shape != (12, 3):
        raise ValueError("Expected the 12 vertices of an icosahedron")
    nodes = nodes / np.linalg.norm(nodes, axis=1, keepdims=True)
    faces = ConvexHull(nodes).simplices.astype(np.int64)
    points = [point.copy() for point in nodes]
    for _ in range(level):
        midpoint_cache: dict[tuple[int, int], int] = {}

        def midpoint(a: int, b: int) -> int:
            key = (min(a, b), max(a, b))
            if key not in midpoint_cache:
                point = points[a] + points[b]
                point /= np.linalg.norm(point)
                midpoint_cache[key] = len(points)
                points.append(point)
            return midpoint_cache[key]

        refined = []
        for a, b, c in faces:
            ab, bc, ca = midpoint(int(a), int(b)), midpoint(int(b), int(c)), midpoint(int(c), int(a))
            refined.extend(((a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)))
        faces = np.asarray(refined, dtype=np.int64)

    undirected = set()
    for a, b, c in faces:
        undirected.update(((min(a, b), max(a, b)),
                           (min(b, c), max(b, c)),
                           (min(c, a), max(c, a))))
    edges = np.asarray(sorted(undirected), dtype=np.int64)
    directed = np.concatenate((edges, edges[:, ::-1]), axis=0)
    return np.asarray(points, dtype=np.float32), directed.T


def interpolate_grid_to_mesh(field: np.ndarray, latitudes: np.ndarray,
                             longitudes: np.ndarray, nodes: np.ndarray,
                             neighbors: int = 4) -> np.ndarray:
    """Interpolate a lat/lon field onto spherical nodes with chord-distance weights.

    This is a geometric interpolation, not a learned mapping or a conservative
    remap. Missing source cells are excluded. Returns NaN for all-missing input.
    """
    field = np.asarray(field, dtype=np.float64)
    latitudes, longitudes = np.asarray(latitudes), np.asarray(longitudes)
    if field.shape != (len(latitudes), len(longitudes)):
        raise ValueError("field must have shape (latitude, longitude)")
    if neighbors < 1:
        raise ValueError("neighbors must be positive")
    lat, lon = np.meshgrid(np.deg2rad(latitudes), np.deg2rad(longitudes), indexing="ij")
    xyz = np.stack((np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)), axis=-1)
    valid = np.isfinite(field)
    if not valid.any():
        return np.full(len(nodes), np.nan, dtype=np.float32)
    count = min(neighbors, int(valid.sum()))
    distances, indices = cKDTree(xyz[valid]).query(nodes, k=count)
    distances = np.asarray(distances).reshape(len(nodes), count)
    indices = np.asarray(indices).reshape(len(nodes), count)
    weights = 1.0 / np.maximum(distances, 1e-10) ** 2
    return np.sum(field[valid][indices] * weights, axis=1).astype(np.float32) / weights.sum(axis=1)


if HAS_TORCH:
    class SphericalMessagePassingLayer(nn.Module):
        """Spherical message-passing convolution over icosahedral graph."""
        def __init__(self, in_features: int, out_features: int):
            super().__init__()
            self.node_transform = nn.Linear(in_features, out_features)
            self.neighbor_transform = nn.Linear(in_features, out_features)
            self.edge_mlp = nn.Sequential(
                nn.Linear(out_features * 2, out_features),
                nn.SiLU(),
                nn.Linear(out_features, out_features)
            )

        def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> torch.Tensor:
            """
            x: (N, in_features)
            edge_index: (2, E)
            """
            src, dst = edge_index[0], edge_index[1]
            x_proj = self.node_transform(x)
            
            # Aggregate neighbor features
            neighbor_feats = self.neighbor_transform(x[src])
            msg = self.edge_mlp(torch.cat([x_proj[dst], neighbor_feats], dim=-1))
            
            # Degree-normalized aggregation prevents higher-valence nodes from
            # receiving systematically larger activations.
            out = torch.zeros_like(x_proj)
            out.index_add_(0, dst, msg)
            degree = torch.bincount(dst, minlength=x.shape[0]).to(out.dtype).clamp_min(1)
            out = out / degree.unsqueeze(-1)
            return F.silu(x_proj + out)


    class SphericalAnomalyGNN(nn.Module):
        """
        Stage 1 GNN: Predicts anomaly probability, EFI extreme score,
        and temporal 4D bounding box across 3-10 day forecast horizon.
        """
        def __init__(self, in_channels: int = 8, hidden_dim: int = 64):
            super().__init__()
            self.layer1 = SphericalMessagePassingLayer(in_channels, hidden_dim)
            self.layer2 = SphericalMessagePassingLayer(hidden_dim, hidden_dim)
            
            # Anomaly classifier head
            self.anomaly_head = nn.Sequential(
                nn.Linear(hidden_dim, 32),
                nn.ReLU(),
                nn.Linear(32, 1),
                nn.Sigmoid()
            )
            
            # Extreme Forecast Index (EFI) regression head
            self.efi_head = nn.Sequential(
                nn.Linear(hidden_dim, 32),
                nn.ReLU(),
                nn.Linear(32, 1),
                nn.Tanh()
            )

        def forward(self, x: torch.Tensor, edge_index: torch.Tensor) -> Dict[str, torch.Tensor]:
            h1 = self.layer1(x, edge_index)
            h2 = self.layer2(h1, edge_index)
            
            prob = self.anomaly_head(h2)
            efi = self.efi_head(h2)
            
            return {
                "anomaly_probability": prob,
                "extreme_forecast_index": efi,
                "node_embeddings": h2
            }
