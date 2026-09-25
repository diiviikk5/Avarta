"""
Unit tests for GraphCast spherical icosahedron multi-mesh builder and GNN layer.
"""

import unittest
import numpy as np
from models.spherical_gnn.icosahedron import (
    generate_icosahedron_vertices,
    subdivide_mesh,
    interpolate_grid_to_mesh,
    HAS_TORCH,
)

if HAS_TORCH:
    import torch
    from models.spherical_gnn.icosahedron import SphericalMessagePassingLayer, SphericalAnomalyGNN


class TestSphericalGNN(unittest.TestCase):
    def setUp(self):
        self.vertices = generate_icosahedron_vertices()
        self.nodes, self.edge_index = subdivide_mesh(self.vertices, level=1)

    def test_mesh_generation(self):
        self.assertEqual(len(self.vertices), 12)
        # Verify unit sphere normalization
        norms = np.linalg.norm(self.vertices, axis=1)
        self.assertTrue(np.allclose(norms, np.ones_like(norms), atol=1e-4))

    def test_subdivided_mesh_graph(self):
        self.assertEqual(self.edge_index.shape[0], 2)
        self.assertEqual(self.nodes.shape, (42, 3))
        self.assertEqual(self.edge_index.shape, (2, 240))
        self.assertTrue(np.allclose(np.linalg.norm(self.nodes, axis=1), 1))
        self.assertEqual({(b, a) for a, b in self.edge_index.T},
                         {tuple(edge) for edge in self.edge_index.T})

    def test_mesh_counts_at_multiple_levels(self):
        for level in range(3):
            nodes, edges = subdivide_mesh(self.vertices, level=level)
            self.assertEqual(len(nodes), 10 * 4**level + 2)
            self.assertEqual(edges.shape[1], 60 * 4**level)

    def test_grid_interpolation_constant_and_missing(self):
        grid = np.ones((3, 4), dtype=np.float32) * 7
        grid[0, 0] = np.nan
        mapped = interpolate_grid_to_mesh(grid, np.array([-30, 0, 30]),
                                          np.array([0, 90, 180, 270]), self.nodes)
        self.assertTrue(np.allclose(mapped, 7))

    @unittest.skipUnless(HAS_TORCH, "PyTorch required for neural layers")
    def test_gnn_message_passing(self):
        in_dim = 16
        out_dim = 32
        layer = SphericalMessagePassingLayer(in_features=in_dim, out_features=out_dim)

        N = self.nodes.shape[0]
        x = torch.randn(N, in_dim)
        edge_tensor = torch.tensor(self.edge_index, dtype=torch.long)

        out = layer(x, edge_tensor)
        self.assertEqual(out.shape, (N, out_dim))

    @unittest.skipUnless(HAS_TORCH, "PyTorch required for neural layers")
    def test_spherical_anomaly_gnn(self):
        in_channels = 8
        model = SphericalAnomalyGNN(in_channels=in_channels, hidden_dim=32)

        N = self.nodes.shape[0]
        x = torch.randn(N, in_channels)
        edge_tensor = torch.tensor(self.edge_index, dtype=torch.long)

        predictions = model(x, edge_tensor)
        self.assertIn("anomaly_probability", predictions)
        self.assertIn("extreme_forecast_index", predictions)
        self.assertEqual(predictions["anomaly_probability"].shape, (N, 1))


if __name__ == "__main__":
    unittest.main()
