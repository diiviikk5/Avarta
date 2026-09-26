"""Spherical mesh geometry and untrained anomaly-tracking architectures.

The mesh builder is real geometry; this module does not ingest NEPS-G or provide a
trained anomaly detector. ``EnsembleTemporalSphericalGNN`` is the production
candidate: it preserves the member axis, uses Earth-relative edge geometry,
models forecast-time evolution and predicts both aleatoric uncertainty and
motion. See the historical replay for the validated data path.
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


    class EarthRelativeMessagePassing(nn.Module):
        """Message passing conditioned on 3-D edge direction and arc length.

        Plain graph convolutions cannot distinguish poleward from zonal flow.
        Cartesian offsets on the unit sphere give every message an orientation
        without introducing the seam and pole distortion of a latitude grid.
        """

        def __init__(self, hidden_dim: int):
            super().__init__()
            self.message = nn.Sequential(
                nn.Linear(hidden_dim * 2 + 4, hidden_dim),
                nn.SiLU(),
                nn.Linear(hidden_dim, hidden_dim),
            )
            self.update = nn.Sequential(
                nn.LayerNorm(hidden_dim * 2),
                nn.Linear(hidden_dim * 2, hidden_dim),
                nn.SiLU(),
            )

        def forward(self, x: torch.Tensor, edge_index: torch.Tensor,
                    node_positions: torch.Tensor) -> torch.Tensor:
            if x.ndim != 2 or node_positions.shape != (x.shape[0], 3):
                raise ValueError("Expected node features [N,H] and unit positions [N,3]")
            src, dst = edge_index
            relative = node_positions[src] - node_positions[dst]
            chord = torch.linalg.vector_norm(relative, dim=-1, keepdim=True)
            messages = self.message(torch.cat((x[dst], x[src], relative, chord), dim=-1))
            aggregate = torch.zeros_like(x)
            aggregate.index_add_(0, dst, messages)
            degree = torch.bincount(dst, minlength=len(x)).to(x.dtype).clamp_min(1).unsqueeze(-1)
            return x + self.update(torch.cat((x, aggregate / degree), dim=-1))


    class EnsembleTemporalSphericalGNN(nn.Module):
        """Ensemble-aware spatio-temporal GNN for 3–10 day anomaly tracking.

        Input is ``[batch, member, lead, node, feature]``. Member attention is
        permutation invariant, so reordering EPS members cannot change a
        forecast. A GRU carries motion through lead time after geometry-aware
        spherical message passing. Heads expose probability, EFI, uncertainty
        and the next centroid displacement rather than a single opaque score.
        """

        def __init__(self, in_channels: int, hidden_dim: int = 64, layers: int = 3):
            super().__init__()
            if in_channels < 1 or hidden_dim < 8 or layers < 1:
                raise ValueError("Invalid feature, hidden or layer count")
            self.member_attention = nn.Sequential(
                nn.Linear(in_channels, max(4, hidden_dim // 4)),
                nn.SiLU(),
                nn.Linear(max(4, hidden_dim // 4), 1),
            )
            self.input_projection = nn.Sequential(
                nn.Linear(in_channels * 2, hidden_dim),
                nn.LayerNorm(hidden_dim),
                nn.SiLU(),
            )
            self.spatial_layers = nn.ModuleList(
                EarthRelativeMessagePassing(hidden_dim) for _ in range(layers)
            )
            self.temporal = nn.GRU(hidden_dim, hidden_dim, batch_first=True)
            self.anomaly_head = nn.Linear(hidden_dim, 1)
            self.efi_head = nn.Linear(hidden_dim, 1)
            self.log_variance_head = nn.Linear(hidden_dim, 1)
            self.motion_head = nn.Linear(hidden_dim, 2)

        def forward(self, x: torch.Tensor, edge_index: torch.Tensor,
                    node_positions: torch.Tensor, member_mask: torch.Tensor | None = None) -> Dict[str, torch.Tensor]:
            if x.ndim != 5:
                raise ValueError("Expected [batch,member,lead,node,feature]")
            batch, members, leads, nodes, _ = x.shape
            if node_positions.shape != (nodes, 3):
                raise ValueError("node_positions must be [node,3]")
            scores = self.member_attention(x).squeeze(-1)
            if member_mask is not None:
                expected = (batch, members, leads, nodes)
                if member_mask.shape != expected:
                    raise ValueError(f"member_mask must have shape {expected}")
                scores = scores.masked_fill(~member_mask.bool(), -torch.inf)
                if (~member_mask.bool()).all(dim=1).any():
                    raise ValueError("Every node/lead requires at least one valid member")
            weights = torch.softmax(scores, dim=1).unsqueeze(-1)
            member_mean = torch.sum(weights * x, dim=1)
            member_spread = torch.sqrt(torch.sum(weights * (x - member_mean[:, None]).square(), dim=1) + 1e-6)
            state = self.input_projection(torch.cat((member_mean, member_spread), dim=-1))

            spatial_steps = []
            for lead in range(leads):
                # Graphs are independent across batch elements at this stage.
                per_batch = []
                for item in range(batch):
                    hidden = state[item, lead]
                    for layer in self.spatial_layers:
                        hidden = layer(hidden, edge_index, node_positions)
                    per_batch.append(hidden)
                spatial_steps.append(torch.stack(per_batch))
            spatial = torch.stack(spatial_steps, dim=1)  # [B,T,N,H]
            sequence = spatial.permute(0, 2, 1, 3).reshape(batch * nodes, leads, -1)
            temporal, _ = self.temporal(sequence)
            temporal = temporal.reshape(batch, nodes, leads, -1).permute(0, 2, 1, 3)
            logits = self.anomaly_head(temporal)
            return {
                "anomaly_logits": logits,
                "anomaly_probability": torch.sigmoid(logits),
                "extreme_forecast_index": torch.tanh(self.efi_head(temporal)),
                "log_variance": self.log_variance_head(temporal).clamp(-8, 6),
                "motion_delta_degrees": self.motion_head(temporal),
                "member_attention": weights.squeeze(-1),
                "node_embeddings": temporal,
            }


    def ensemble_temporal_loss(
        predictions: Dict[str, torch.Tensor],
        anomaly_target: torch.Tensor,
        efi_target: torch.Tensor,
        motion_target: torch.Tensor,
        valid_mask: torch.Tensor | None = None,
        focal_gamma: float = 2.0,
    ) -> Dict[str, torch.Tensor]:
        """Calibratable multi-task loss with heteroscedastic EFI regression."""
        logits = predictions["anomaly_logits"]
        if anomaly_target.shape != logits.shape or efi_target.shape != logits.shape:
            raise ValueError("Anomaly and EFI targets must match scalar prediction heads")
        if motion_target.shape != predictions["motion_delta_degrees"].shape:
            raise ValueError("Motion target must match the two-component motion head")
        mask = torch.ones_like(logits) if valid_mask is None else valid_mask.to(logits.dtype)
        if mask.shape != logits.shape or mask.sum() == 0:
            raise ValueError("valid_mask must match heads and select at least one value")
        bce = F.binary_cross_entropy_with_logits(logits, anomaly_target, reduction="none")
        probability = torch.sigmoid(logits)
        focal = ((anomaly_target * (1 - probability) + (1 - anomaly_target) * probability) ** focal_gamma * bce * mask).sum() / mask.sum()
        log_variance = predictions["log_variance"]
        efi_nll = ((torch.exp(-log_variance) * (predictions["extreme_forecast_index"] - efi_target).square()
                    + log_variance) * mask).sum() / mask.sum()
        motion_mask = mask.expand_as(motion_target)
        motion = (F.smooth_l1_loss(predictions["motion_delta_degrees"], motion_target, reduction="none")
                  * motion_mask).sum() / motion_mask.sum()
        # Brier score is reported explicitly because probability calibration is
        # a first-class requirement for alerts.
        brier = ((probability - anomaly_target).square() * mask).sum() / mask.sum()
        total = focal + 0.5 * efi_nll + 0.25 * motion + 0.25 * brier
        return {"loss": total, "focal_loss": focal, "efi_nll": efi_nll,
                "motion_loss": motion, "brier_score": brier}
