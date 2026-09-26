"""OASIS Common Alerting Protocol (CAP v1.2) Engine.

Produces standard civil-defense alert feeds adhering to India's National Disaster
Management Authority (NDMA) SACHET alerting format and WMO CAP 1.2 specifications:
- Structured XML and JSON output
- Severe / High / Moderate risk categorization
- Explicit 5 km polygon impact boundaries
- Actionable civil defense instructions for NDRF, SDRF, and District Magistrates.
"""

from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional
import xml.etree.ElementTree as ET


def generate_cap_v1_2_xml(
    alert_id: str,
    headline: str,
    event_name: str,
    severity: str = "Severe",
    urgency: str = "Immediate",
    certainty: str = "Observed",
    area_desc: str = "Faridabad - Delhi NCR Hazard Corridor",
    polygon_coords: Optional[List[List[float]]] = None,
    instruction: str = "Deploy NDRF flood rescue teams. Evacuate low-lying drainage settlements.",
    expires_hours: int = 12,
    parameters: Optional[Dict[str, str]] = None,
) -> str:
    """Generate official OASIS CAP v1.2 XML document string."""
    now = datetime.datetime.now(datetime.timezone.utc)
    sent_iso = now.strftime("%Y-%m-%dT%H:%M:%S+00:00")
    expires_iso = (now + datetime.timedelta(hours=expires_hours)).strftime("%Y-%m-%dT%H:%M:%S+00:00")

    alert = ET.Element("alert", xmlns="urn:oasis:names:tc:emergency:cap:1.2")
    ET.SubElement(alert, "identifier").text = f"IN-NDMA-AVARTA-{alert_id}"
    ET.SubElement(alert, "sender").text = "ncmrwf-avarta@moes.gov.in"
    ET.SubElement(alert, "sent").text = sent_iso
    ET.SubElement(alert, "status").text = "Actual"
    ET.SubElement(alert, "msgType").text = "Alert"
    ET.SubElement(alert, "source").text = "Avarta AI-Driven Anomaly Tracking Core"
    ET.SubElement(alert, "scope").text = "Public"

    info = ET.SubElement(alert, "info")
    ET.SubElement(info, "language").text = "en-IN"
    ET.SubElement(info, "category").text = "Met"
    ET.SubElement(info, "event").text = event_name
    ET.SubElement(info, "urgency").text = urgency
    ET.SubElement(info, "severity").text = severity
    ET.SubElement(info, "certainty").text = certainty
    ET.SubElement(info, "expires").text = expires_iso
    ET.SubElement(info, "senderName").text = "NCMRWF / Ministry of Earth Sciences"
    ET.SubElement(info, "headline").text = headline
    ET.SubElement(info, "description").text = (
        f"AI-driven 5 km downscaled forecast detects {severity.lower()} threat envelope. "
        "Hyper-local threat analysis indicates immediate infrastructure disruption."
    )
    ET.SubElement(info, "instruction").text = instruction

    # Area block with 5 km polygon contour
    area = ET.SubElement(info, "area")
    ET.SubElement(area, "areaDesc").text = area_desc

    if polygon_coords:
        # GeoJSON is [lon, lat], CAP 1.2 requires "lat,lon lat,lon"
        poly_str = " ".join([f"{pt[1]:.5f},{pt[0]:.5f}" for pt in polygon_coords])
    else:
        # Default 5 km buffer around Faridabad
        poly_str = "28.445,77.310 28.432,77.355 28.375,77.340 28.360,77.290 28.410,77.270 28.445,77.310"

    ET.SubElement(area, "polygon").text = poly_str

    # Key parameters
    params = parameters or {
        "HazardRadius": "5km",
        "DisseminationTarget": "NDRF-Battalion-08 / SDMA-Haryana",
        "PhysicsVerification": "MoistureFluxContinuity-Enforced",
        "ColorCode": "RED" if severity in ("Severe", "Extreme") else "ORANGE",
    }
    for k, v in params.items():
        param_elem = ET.SubElement(info, "parameter")
        ET.SubElement(param_elem, "valueName").text = k
        ET.SubElement(param_elem, "value").text = str(v)

    return ET.tostring(alert, encoding="utf-8", xml_declaration=True).decode("utf-8")


def generate_cap_feed(alerts_list: List[Dict[str, Any]]) -> str:
    """Generate an Atom/RSS feed containing all active CAP 1.2 alerts."""
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
    feed = ET.Element("feed", xmlns="http://www.w3.org/2005/Atom")
    ET.SubElement(feed, "title").text = "Avarta National Extreme Weather CAP Alert Feed"
    ET.SubElement(feed, "updated").text = now
    ET.SubElement(feed, "id").text = "urn:uuid:avarta-national-cap-feed"

    for item in alerts_list:
        entry = ET.SubElement(feed, "entry")
        ET.SubElement(entry, "id").text = item["id"]
        ET.SubElement(entry, "title").text = item["headline"]
        ET.SubElement(entry, "updated").text = now
        content = ET.SubElement(entry, "content", type="application/cap+xml")
        content.text = item.get("xml_payload", "")

    return ET.tostring(feed, encoding="utf-8", xml_declaration=True).decode("utf-8")
