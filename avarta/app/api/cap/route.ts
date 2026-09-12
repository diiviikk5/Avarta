import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "xml";

  const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>IN-NDMA-AVARTA-20250823-001</identifier>
  <sender>ncmrwf-avarta@moes.gov.in</sender>
  <sent>${new Date().toISOString()}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <source>Avarta AI-Driven Anomaly Tracking Core</source>
  <scope>Public</scope>
  <info>
    <language>en-IN</language>
    <category>Met</category>
    <event>Severe Precipitation / Local Flash Flood</event>
    <urgency>Immediate</urgency>
    <severity>Severe</severity>
    <certainty>Observed</certainty>
    <expires>${new Date(Date.now() + 12 * 3600 * 1000).toISOString()}</expires>
    <senderName>NCMRWF / Ministry of Earth Sciences</senderName>
    <headline>Provisional Extreme Rainfall Watch in Haryana / NCR</headline>
    <description>AI-driven 5 km downscaled forecast detects severe threat envelope. Hyper-local threat analysis indicates immediate infrastructure disruption.</description>
    <instruction>Deploy NDRF flood rescue teams. Evacuate low-lying drainage settlements. Stand down non-emergency highway traffic.</instruction>
    <area>
      <areaDesc>Faridabad Sector 12 - Ballabgarh Lifeline Corridor</areaDesc>
      <polygon>28.445,77.310 28.432,77.355 28.375,77.340 28.360,77.290 28.410,77.270 28.445,77.310</polygon>
    </area>
    <parameter>
      <valueName>HazardRadius</valueName>
      <value>5km</value>
    </parameter>
    <parameter>
      <valueName>ColorCode</valueName>
      <value>RED</value>
    </parameter>
    <parameter>
      <valueName>DisseminationTarget</valueName>
      <value>NDRF-Battalion-08 / SDMA-Haryana</value>
    </parameter>
  </info>
</alert>`;

  if (format === "json") {
    return NextResponse.json({
      identifier: "IN-NDMA-AVARTA-20250823-001",
      event: "Severe Precipitation / Local Flash Flood",
      severity: "Severe",
      urgency: "Immediate",
      headline: "Provisional Extreme Rainfall Watch in Haryana / NCR",
      instruction: "Deploy NDRF flood rescue teams. Evacuate low-lying drainage settlements.",
      areaDesc: "Faridabad Sector 12 - Ballabgarh Corridor",
      polygon: "28.445,77.310 28.432,77.355 28.375,77.340 28.360,77.290 28.410,77.270 28.445,77.310",
      colorCode: "RED",
      xml_payload: xmlContent,
    });
  }

  return new Response(xmlContent, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
