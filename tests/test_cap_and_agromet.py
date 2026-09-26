"""Unit tests for Milestone 3: 5km Spatial Polygons, CAP 1.2 XML, and Agromet Advisories."""

import unittest
from services.impact.spatial_polygons import geodesic_polygon_buffer, build_hazard_geojson, haversine_distance_km
from services.alerts.cap_feed import generate_cap_v1_2_xml, generate_cap_feed
from services.alerts.agromet import generate_agromet_advisories


class TestMilestone3(unittest.TestCase):
    def test_geodesic_buffer_creates_closed_polygon(self):
        coords = geodesic_polygon_buffer(28.40, 77.31, radius_km=5.0, num_vertices=16)
        # Check closed ring
        self.assertEqual(coords[0], coords[-1])
        self.assertEqual(len(coords), 17)
        # Check distance from center to first vertex is ~5 km
        first_pt = coords[0]
        dist = haversine_distance_km(28.40, 77.31, first_pt[1], first_pt[0])
        self.assertAlmostEqual(dist, 5.0, delta=0.1)

    def test_hazard_geojson_with_infrastructure_intersection(self):
        # Threat point placed right at Faridabad (28.40, 77.31)
        threats = [
            {"id": "THREAT-FARIDABAD", "lat": 28.40, "lon": 77.31, "radius_km": 6.0, "severity": "SEVERE", "hazard": "Extreme Rain"}
        ]
        geojson = build_hazard_geojson(threats, default_radius_km=6.0)
        self.assertEqual(geojson["type"], "FeatureCollection")
        self.assertIn("summary", geojson)
        # Check that BK Civil Hospital or Ballabgarh substation or NH-44 was detected
        self.assertGreater(geojson["summary"]["exposed_critical_assets_count"], 0)
        self.assertGreater(geojson["summary"]["estimated_exposed_population"], 1000)

    def test_cap_v1_2_xml_generation(self):
        xml_str = generate_cap_v1_2_xml(
            alert_id="TEST-001",
            headline="Severe Rainfall Warning in Faridabad",
            event_name="Flash Flood / Cloudburst",
            severity="Severe",
            area_desc="Faridabad Sector 12 - NH44",
        )
        self.assertIn('xmlns="urn:oasis:names:tc:emergency:cap:1.2"', xml_str)
        self.assertIn("<event>Flash Flood / Cloudburst</event>", xml_str)
        self.assertIn("<severity>Severe</severity>", xml_str)
        self.assertIn("<polygon>", xml_str)

    def test_cap_feed_generation(self):
        alerts = [
            {"id": "ALERT-1", "headline": "Faridabad Flash Flood", "xml_payload": "<alert/>"},
            {"id": "ALERT-2", "headline": "Sundarbans Cyclone Gale", "xml_payload": "<alert/>"},
        ]
        feed = generate_cap_feed(alerts)
        self.assertIn("<feed", feed)
        self.assertIn("<entry>", feed)

    def test_agromet_advisories_different_hazards(self):
        rain_advisory = generate_agromet_advisories("rainfall", severity="SEVERE", lead_hours=48)
        self.assertIn("crop_advisories", rain_advisory)
        self.assertIn("Paddy", str(rain_advisory["crop_advisories"]))

        cyclone_advisory = generate_agromet_advisories("cyclone", severity="SEVERE", lead_hours=72)
        self.assertIn("crop_advisories", cyclone_advisory)
        self.assertIn("Harvest mature crop", str(cyclone_advisory["crop_advisories"]))

        heat_advisory = generate_agromet_advisories("heatwave", severity="SEVERE", lead_hours=96)
        self.assertIn("mulching", str(heat_advisory["crop_advisories"]).lower())


if __name__ == "__main__":
    unittest.main()
