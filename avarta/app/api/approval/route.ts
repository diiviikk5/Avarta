import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";

export interface AgentProposedAction {
  id: string;
  timestamp: string;
  threat_id: string;
  threat_name: string;
  priority: "CRITICAL" | "HIGH" | "ADVISORY";
  action_category: "DISASTER_DEPLOYMENT" | "DAM_RELEASE" | "POWER_DE_ENERGIZE" | "PUBLIC_CAP_ALERT";
  title: string;
  rationale: string;
  affected_jurisdictions: string[];
  estimated_lives_protected: number;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXECUTED";
  reviewed_by?: string;
  review_notes?: string;
  execution_payload: Record<string, unknown>;
  dispatch_hash?: string;
}

const seededActions: AgentProposedAction[] = [
  {
    id: "ACT-NDRF-2026-081", timestamp: "2026-09-26T08:12:04Z", threat_id: "THREAT-CYC-BAY-04B",
    threat_name: "Severe Cyclonic Storm ‘Dana’", priority: "CRITICAL", action_category: "DISASTER_DEPLOYMENT",
    title: "Stage 4 battalions to coastal Balasore & Kendrapara districts before T+36h",
    rationale: "5 km downscaled wind exceeds 65 kt with 88% ensemble probability at T+48h; the P90 corridor intersects 0.38M people in the severe zone.",
    affected_jurisdictions: ["Balasore", "Kendrapara", "Bhadrak"], estimated_lives_protected: 380000,
    status: "PENDING_REVIEW", execution_payload: { agency: "NDRF", battalions: 4, staging_deadline: "T+36h", portal: "NDMA-IDRN" },
  },
  {
    id: "ACT-DAM-2026-027", timestamp: "2026-09-26T08:13:19Z", threat_id: "THREAT-RAIN-MAH-19A",
    threat_name: "Mahanadi Extreme Rainfall Cluster", priority: "HIGH", action_category: "DAM_RELEASE",
    title: "Pre-deplete Hirakud Dam reservoir by 15% to buffer 180mm catchment runoff",
    rationale: "Hydrometeorological routing projects 180 mm catchment rainfall in 24h and a 1-in-20-year inflow pulse at T+54h.",
    affected_jurisdictions: ["Sambalpur", "Bargarh", "Subarnapur"], estimated_lives_protected: 214000,
    status: "PENDING_REVIEW", execution_payload: { asset: "Hirakud", target_drawdown_percent: 15, max_release_cumecs: 7200 },
  },
  {
    id: "ACT-GRID-2026-044", timestamp: "2026-09-26T08:15:43Z", threat_id: "THREAT-CYC-BAY-04B",
    threat_name: "Severe Cyclonic Storm ‘Dana’", priority: "CRITICAL", action_category: "POWER_DE_ENERGIZE",
    title: "De-energize 132kV transmission corridor Cuttack-Puri to prevent cascading transformer explosion",
    rationale: "Modelled 44.2 m/s peak gusts exceed the corridor design trigger while saline spray raises flashover probability to 0.71.",
    affected_jurisdictions: ["Cuttack", "Puri", "Khurda"], estimated_lives_protected: 89000,
    status: "PENDING_REVIEW", execution_payload: { utility: "OPTCL", corridor: "Cuttack-Puri 132kV", isolation_window: "T+41h–T+52h" },
  },
];

const globalStore = globalThis as typeof globalThis & { __avartaApprovalActions?: AgentProposedAction[] };
const actions = globalStore.__avartaApprovalActions ?? seededActions.map((action) => ({ ...action }));
globalStore.__avartaApprovalActions = actions;

export async function GET() {
  return NextResponse.json({ workflow: ["AGENT_PROPOSES", "HUMAN_REVIEWS", "APPROVE_OR_REJECT", "EXECUTE_ACTION"], orchestrator: "LangGraph human-in-the-loop checkpoint", actions });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: string; decision?: "approve" | "reject" | "modify"; reviewed_by?: string; review_notes?: string; execution_payload?: Record<string, unknown> };
  const action = actions.find((candidate) => candidate.id === body.id);
  if (!action) return NextResponse.json({ error: "Action not found" }, { status: 404 });
  if (action.status !== "PENDING_REVIEW") return NextResponse.json({ error: "Action has already been reviewed", action }, { status: 409 });
  if (body.decision === "modify") {
    action.execution_payload = { ...action.execution_payload, ...body.execution_payload };
    action.review_notes = body.review_notes || "Parameters modified; returned to human review queue.";
    return NextResponse.json({ action });
  }
  action.reviewed_by = body.reviewed_by || "Duty Forecaster / NDRF Incident Commander";
  action.review_notes = body.review_notes;
  action.status = body.decision === "reject" ? "REJECTED" : "APPROVED";
  if (body.decision === "approve") {
    const digest = createHash("sha256").update(`${action.id}:${action.reviewed_by}:${Date.now()}:${randomUUID()}`).digest("hex");
    action.dispatch_hash = `0x${digest.slice(0, 12)}…${digest.slice(-4)}`;
  }
  return NextResponse.json({
    action,
    audit_event: {
      timestamp: new Date().toISOString(), channel: body.decision === "approve" ? "SEOC/NDMA secure webhook" : "LangGraph review checkpoint",
      message: body.decision === "approve" ? `${action.id} signed and dispatched to ${action.affected_jurisdictions.join(", ")}` : `${action.id} rejected by ${action.reviewed_by}`,
    },
  });
}
