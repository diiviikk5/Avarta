"""
Unit tests for GraphCast spherical icosahedron multi-mesh builder and GNN layer.
"""

import unittest
import torch
from models.spherical_gnn.icosahedron import IcosahedronMeshBuilder, SphericalGNNLayer

class TestSphericalGNN(unittest.TestCase):
    def setUp(self):
        self.builder = IcosahedronMeshBuilder(subdivision_levels=2)
        self.vertices, self.faces = self.builder.generate_multimesh()

    def test_mesh_generation(self):
        self.assertGreater(len(self.vertices), 12)
        self.assertGreater(len(self.faces), 20)
        # Verify unit sphere normalization
        norms = torch.norm(self.vertices, dim=-1)
        self.assertTrue(torch.allclose(norms, torch.ones_like(norms), atol=1e-4))

    def test_gnn_message_passing(self):
        in_dim = 16
        out_dim = 32
        gnn = SphericalGNNLayer(in_channels=in_dim, out_channels=out_dim)
        
        N = self.vertices.shape[0]
        node_feats = torch.randn(N, in_dim)
        
        # Build simple edge index from faces
        edges = []
        for face in self.faces:
            edges.append([face[0].item(), face[1].item()])
            edges.append([face[1].item(), face[2].item()])
            edges.append([face[2].item(), face[0].item()])
        edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()

        out = gnn(node_feats, edge_index)
        self.assertEqual(out.shape, (N, out_dim))

if __name__ == "__main__":
    unittest.main()
