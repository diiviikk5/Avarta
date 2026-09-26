import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hazard = (searchParams.get("hazard") || "rainfall").toLowerCase();
  const leadHours = parseInt(searchParams.get("lead") || "72", 10);
  const leadDays = Math.round((leadHours / 24.0) * 10) / 10;

  let title = `Heavy Rainfall & Flash Flood Advisory (${leadDays} Days Lead)`;
  let cropAdvisories = [
    {
      crop: "Paddy / Basmati Rice",
      stage: "Tillering / Flowering",
      action: "Ensure bund heights and open field drainage channels to prevent root-zone submergence. Postpone urea top-dressing.",
      urgency: "Immediate within 24h",
    },
    {
      crop: "Cotton",
      stage: "Boll formation",
      action: "Clear furrows to drain stagnant water within 6 hours of downpour to avoid boll rot and parawilt.",
      urgency: "Before rain onset",
    },
    {
      crop: "Horticulture / Vegetables",
      stage: "Fruiting",
      action: "Provide bamboo staking to prevent lodging. Spray Mancozeb (2g/L) after rain subsides to check fungal blight.",
      urgency: "Post-event follow-up",
    },
    {
      crop: "Harvested Produce",
      stage: "Post-Harvest",
      action: "Shift harvested grain and fodder immediately to elevated, waterproof warehouse storage or cover with silpaulin sheets.",
      urgency: "Critical / Next 12 hours",
    },
  ];
  let livestock = "Keep cattle in covered shed with dry bedding. Avoid grazing near seasonal drains or electric transmission lines.";

  if (hazard.includes("cyclone")) {
    title = `Severe Cyclonic Storm & Gale Wind Warning (${leadDays} Days Lead)`;
    cropAdvisories = [
      {
        crop: "Standing Paddy",
        stage: "Maturity",
        action: "Harvest mature crop immediately (85% grain maturity is sufficient) to protect from high-speed shattering and lodging.",
        urgency: "Immediate / 48h lead",
      },
      {
        crop: "Banana & Papaya Orchards",
        stage: "Fruiting",
        action: "Provide strong bamboo support. Tie pseudostems together to reduce wind drag.",
        urgency: "Next 24 hours",
      },
      {
        crop: "Fisheries & Aquaculture",
        stage: "Stocking",
        action: "Place nylon nets over embankment edges of fish ponds to prevent fish escapement during storm surge.",
        urgency: "Prior to landfall",
      },
      {
        crop: "Marine Fishing",
        stage: "Offshore",
        action: "Complete suspension of marine fishing vessels. Anchor boats securely in creeks.",
        urgency: "Mandatory immediately",
      },
    ];
    livestock = "Vaccinate cattle against hemorrhagic septicemia (HS) ahead of waterlogging.";
  } else if (hazard.includes("heat")) {
    title = `Severe Heat Dome & Evapotranspiration Warning (${leadDays} Days Lead)`;
    cropAdvisories = [
      {
        crop: "Cotton & Sugarcane",
        stage: "Vegetative",
        action: "Apply light and frequent micro-irrigation during early morning or evening hours to avoid thermal shock.",
        urgency: "Ongoing during heatwave",
      },
      {
        crop: "Vegetables & Pulses",
        stage: "Pod development",
        action: "Apply straw or dry grass mulching (5-8 cm) between crop rows to minimize soil moisture evaporation.",
        urgency: "Next 48 hours",
      },
      {
        crop: "Chemical Spraying",
        stage: "Crop protection",
        action: "Strictly suspend chemical spraying when temperatures exceed 40°C to avoid foliage scorching.",
        urgency: "Peak sun (11 AM - 4 PM)",
      },
    ];
    livestock = "Provide continuous cool drinking water with electrolytes. Spray water on roofs of dairy sheds; use foggers/misters.";
  }

  return NextResponse.json({
    advisory_id: `GKMS-${hazard.toUpperCase()}-${Math.round(leadDays)}D`,
    title: title,
    region: "Northwest India / Ganga Basin",
    lead_days: leadDays,
    hazard_type: hazard,
    crop_advisories: cropAdvisories,
    livestock_management: livestock,
    economic_rationale: `Providing a ${leadDays}-day lead time enables farmers to protect harvest yields, schedule irrigation before grid shutdowns, and prevent agricultural losses.`,
  });
}
