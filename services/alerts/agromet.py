"""Agrometeorological Advisory Generator (Protecting Rural Economies).

Directly addresses the use case in MoES Problem Statement #26078:
"Grants farming communities a highly accurate, 3- to 10-day lead time regarding
localized catastrophic anomalies like sudden frost, hail, or heat domes. This
structural foresight lets farmers alter harvesting schedules or apply crop-
protection covers, shielding rural livelihoods from sudden climate shocks."

Emulates the Gramin Krishi Mausam Sewa (GKMS / Agromet) advisory protocol of IMD / ICAR.
"""

from __future__ import annotations

from typing import Any, Dict, List


def generate_agromet_advisories(
    hazard_type: str = "rainfall",
    severity: str = "SEVERE",
    lead_hours: int = 72,
    region: str = "Northwest India (Haryana-Punjab-Rajasthan)",
) -> Dict[str, Any]:
    """Generate structured Agromet Advisories for farmers based on medium-range forecasts."""
    hazard = hazard_type.lower()
    days_lead = round(lead_hours / 24.0, 1)

    if "rain" in hazard:
        alert_title = f"Heavy Rainfall & Flash Flood Advisory ({days_lead} Days Lead)"
        crop_advisories = [
            {
                "crop": "Paddy / Basmati Rice",
                "stage": "Tillering / Flowering",
                "action": "Ensure bund heights and open field drainage channels to prevent root-zone submergence. Postpone urea top-dressing.",
                "urgency": "Immediate within 24h",
            },
            {
                "crop": "Cotton",
                "stage": "Boll formation",
                "action": "Clear furrows to drain stagnant water within 6 hours of downpour to avoid boll rot and parawilt.",
                "urgency": "Before rain onset",
            },
            {
                "crop": "Horticulture / Vegetables (Tomato, Chili)",
                "stage": "Fruiting",
                "action": "Provide bamboo staking to prevent lodging. Spray Mancozeb (2g/L) after rain subsides to check fungal blight.",
                "urgency": "Post-event follow-up",
            },
            {
                "crop": "Harvested Produce",
                "stage": "Post-Harvest",
                "action": "Shift harvested grain and fodder immediately to elevated, waterproof warehouse storage or cover with silpaulin sheets.",
                "urgency": "Critical / Next 12 hours",
            },
        ]
        livestock = "Keep cattle in covered shed with dry bedding. Avoid grazing near seasonal drains or electric transmission lines."

    elif "cyclone" in hazard:
        alert_title = f"Severe Cyclonic Storm & Gale Wind Warning ({days_lead} Days Lead)"
        crop_advisories = [
            {
                "crop": "Standing Paddy",
                "stage": "Maturity",
                "action": "Harvest mature crop immediately (85% grain maturity is sufficient) to protect from high-speed shattering and lodging.",
                "urgency": "Immediate / 48h lead",
            },
            {
                "crop": "Banana & Papaya Orchards",
                "stage": "Vegetative / Fruiting",
                "action": "Provide strong bamboo or earthen earthing-up support. Tie pseudostems together to reduce wind drag.",
                "urgency": "Next 24 hours",
            },
            {
                "crop": "Fisheries & Coastal Aquaculture",
                "stage": "Stocking",
                "action": "Place fine nylon nets over embankment edges of prawn and fish ponds to prevent fish escapement during storm surge.",
                "urgency": "Critical / Prior to landfall",
            },
            {
                "crop": "Marine Fishing",
                "stage": "Offshore",
                "action": "Complete suspension of marine fishing vessels and trawlers. Anchor boats securely in creeks.",
                "urgency": "Mandatory immediately",
            },
        ]
        livestock = "Vaccinate cattle against hemorrhagic septicemia (HS) and black quarter (BQ) ahead of floodings."

    elif "heat" in hazard:
        alert_title = f"Severe Heat Dome & Evapotranspiration Warning ({days_lead} Days Lead)"
        crop_advisories = [
            {
                "crop": "Cotton & Sugarcane",
                "stage": "Early Vegetative",
                "action": "Apply light and frequent micro-irrigation during early morning or evening hours to avoid thermal shock.",
                "urgency": "Ongoing during heatwave",
            },
            {
                "crop": "Vegetables & Pulses (Mung, Urad)",
                "stage": "Pod development",
                "action": "Apply straw or dry grass mulching (5-8 cm) between crop rows to minimize soil moisture evaporation and soil temperature.",
                "urgency": "Next 48 hours",
            },
            {
                "crop": "Pesticide Application",
                "stage": "Crop protection",
                "action": "Strictly suspend chemical spraying when temperatures exceed 40°C to avoid scorching of foliage and volatile loss.",
                "urgency": "During peak sun (11 AM - 4 PM)",
            },
        ]
        livestock = "Provide continuous cool drinking water with electrolytes. Spray water on roofs of dairy sheds; use foggers/misters."

    else:
        alert_title = f"General Agro-Meteorological Advisory ({days_lead} Days Lead)"
        crop_advisories = [
            {
                "crop": "General Crops",
                "stage": "All stages",
                "action": "Monitor soil moisture regularly and follow local Krishi Vigyan Kendra (KVK) guidance.",
                "urgency": "Routine",
            }
        ]
        livestock = "Maintain adequate clean drinking water and balanced nutritional feed."

    return {
        "advisory_id": f"GKMS-{hazard.upper()}-{int(days_lead)}D",
        "title": alert_title,
        "region": region,
        "lead_days": days_lead,
        "hazard_type": hazard_type,
        "severity": severity,
        "crop_advisories": crop_advisories,
        "livestock_management": livestock,
        "economic_rationale": (
            f"Providing a {days_lead}-day lead time enables farmers to protect harvest yields, "
            "schedule irrigation before grid shutdowns, and prevent preventable agricultural losses."
        ),
    }
