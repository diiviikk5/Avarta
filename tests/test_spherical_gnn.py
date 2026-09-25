"""
Unit tests for GraphCast spherical icosahedron multi-mesh builder and GNN layer.
"""

import unittest
import numpy as np
from models.spherical_gnn.icosahedron import (
    generate_icosahedron_vertices,
    subdivide_mesh,
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
        self.assertGreater(self.edge_index.shape[1], 0)

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
