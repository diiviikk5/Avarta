"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Edit3, Send, ShieldCheck, XCircle } from "lucide-react";
import styles from "./sih.module.css";

interface AgentProposedAction {
  id: string; timestamp: string; threat_id: string; threat_name: string; priority: "CRITICAL" | "HIGH" | "ADVISORY";
  action_category: string; title: string; rationale: string; affected_jurisdictions: string[];
  estimated_lives_protected: number; status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXECUTED";
  reviewed_by?: string; review_notes?: string; execution_payload: Record<string, unknown>; dispatch_hash?: string;
}

interface AuditEvent { timestamp: string; channel: string; message: string; hash?: string }

export default function HumanApprovalConsole() {
  const [actions, setActions] = useState<AgentProposedAction[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([
    { timestamp: "2026-09-26T08:00:00Z", channel: "LangGraph", message: "Human approval checkpoint online; autonomous execution is locked." },
  ]);
  const [busy, setBusy] = useState<string | null>(null);
  const [review, setReview] = useState<{ action: AgentProposedAction; decision: "approve" | "reject" | "modify" } | null>(null);
  const [reviewer, setReviewer] = useState("Duty Forecaster / NDRF Incident Commander");
  const [reviewNotes, setReviewNotes] = useState("");
  const [parameterOverride, setParameterOverride] = useState("");

  useEffect(() => { void fetch("/api/approval").then((r) => r.json()).then((data) => setActions(data.actions ?? [])); }, []);

  function openReview(action: AgentProposedAction, decision: "approve" | "reject" | "modify") {
    setReview({ action, decision });
    setReviewNotes(decision === "reject" ? "Insufficient confidence / operational conflict" : "");
    setParameterOverride(decision === "modify" ? JSON.stringify(action.execution_payload, null, 2) : "");
  }

  async function decide() {
    if (!review) return;
    const { action, decision } = review;
    const executionPayload = decision === "modify" ? { command_override: parameterOverride, modified_at: new Date().toISOString() } : undefined;
    setBusy(action.id);
    try {
      const response = await fetch("/api/approval", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: action.id, decision, reviewed_by: reviewer, review_notes: reviewNotes, execution_payload: executionPayload }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Review failed");
      setActions((current) => current.map((item) => item.id === action.id ? data.action : item));
      if (data.audit_event) setAudit((current) => [{ ...data.audit_event, hash: data.action.dispatch_hash }, ...current]);
      else setAudit((current) => [{ timestamp: new Date().toISOString(), channel: "Human Review", message: `${action.id} parameters modified; action remains pending.` }, ...current]);
      setReview(null);
    } catch (error) {
      setAudit((current) => [{ timestamp: new Date().toISOString(), channel: "ERROR", message: error instanceof Error ? error.message : "Review failed" }, ...current]);
    } finally { setBusy(null); }
  }

  const pending = actions.filter((action) => action.status === "PENDING_REVIEW");
  return <div className={styles.module}>
    <section className={styles.panel}>
      <div className={styles.pipeline}>
        {["Agent Proposes", "Human Reviews", "Approve / Reject", "Execute Action"].map((label, index) => <div className={styles.step} key={label}><b>0{index + 1}</b><span>{label}</span></div>)}
      </div>
      <div className={styles.header}>
        <div><div className={styles.eyebrow}>LANGCHAIN / LANGGRAPH · INTERRUPT BEFORE TOOL</div><h2>Human authority remains in the loop</h2><p>Every high-consequence action is cryptographically signed only after an accountable officer reviews the model rationale.</p></div>
        <span className={styles.badge}><ShieldCheck size={13}/> {pending.length} AWAITING REVIEW</span>
      </div>
      <div className={styles.pad}>
        <div className={styles.cards}>
          {pending.map((action) => <article key={action.id} className={styles.actionCard}>
            <div className={styles.actionTop}><div><span className={styles.severity}>{action.priority}</span><span className={styles.muted}> &nbsp;{action.id} · {action.threat_id}</span></div><span className={styles.muted}>{new Date(action.timestamp).toLocaleTimeString()}</span></div>
            <h3>{action.title}</h3><p className={styles.muted}>{action.threat_name} · {action.action_category.replaceAll("_", " ")}</p>
            <div className={styles.rationale}><b>AI + physics rationale</b><br/>{action.rationale}</div>
            <div className={styles.tags}>{action.affected_jurisdictions.map((district) => <span className={styles.tag} key={district}>{district}</span>)}<span className={styles.tag}>{action.estimated_lives_protected.toLocaleString()} lives protected</span></div>
            <div className={styles.buttonRow}>
              <button className={`${styles.button} ${styles.approve}`} disabled={busy === action.id} onClick={() => openReview(action, "approve")}><Send size={13}/> Approve & Dispatch</button>
              <button className={`${styles.button} ${styles.reject}`} disabled={busy === action.id} onClick={() => openReview(action, "reject")}><XCircle size={13}/> Reject</button>
              <button className={styles.button} disabled={busy === action.id} onClick={() => openReview(action, "modify")}><Edit3 size={13}/> Modify Parameters</button>
            </div>
          </article>)}
          {pending.length === 0 && <div className={styles.stat}><CheckCircle2 color="#22c55e"/><strong>Review queue clear</strong><span>All proposed actions have an accountable disposition.</span></div>}
        </div>
        {review && <div className={styles.actionCard} style={{ marginTop: 14, borderLeftColor: review.decision === "reject" ? "#ef4444" : review.decision === "approve" ? "#22c55e" : "#38bdf8" }}>
          <div className={styles.eyebrow}>HUMAN REVIEW CHECKPOINT · {review.decision.toUpperCase()}</div>
          <h3>{review.action.id} · {review.action.title}</h3>
          <label className={styles.muted}>Accountable reviewer</label>
          <input className={styles.input} style={{ width: "100%", margin: "6px 0 10px" }} value={reviewer} onChange={(event) => setReviewer(event.target.value)}/>
          <label className={styles.muted}>{review.decision === "modify" ? "Parameter override" : "Review notes"}</label>
          {review.decision === "modify"
            ? <textarea className={styles.input} style={{ width: "100%", minHeight: 110, margin: "6px 0 10px", fontFamily: "monospace" }} value={parameterOverride} onChange={(event) => setParameterOverride(event.target.value)}/>
            : <textarea className={styles.input} style={{ width: "100%", minHeight: 70, margin: "6px 0 10px" }} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Optional operational context"/>}
          <div className={styles.buttonRow}><button className={`${styles.button} ${review.decision === "reject" ? styles.reject : styles.approve}`} disabled={!reviewer.trim() || busy === review.action.id} onClick={() => void decide()}>{review.decision === "approve" ? <Send size={13}/> : review.decision === "reject" ? <XCircle size={13}/> : <Edit3 size={13}/>} Confirm {review.decision}</button><button className={styles.button} onClick={() => setReview(null)}>Cancel</button></div>
        </div>}
      </div>
    </section>
    <section className={`${styles.panel} ${styles.pad}`} style={{ marginTop: 14 }}>
      <div className={styles.eyebrow}>REAL-TIME EXECUTION AUDIT TRAIL</div><h3 className={styles.sectionTitle}>Secure webhook dispatch terminal</h3>
      <div className={styles.terminal} aria-live="polite">
        {audit.map((entry, index) => <div key={`${entry.timestamp}-${index}`}>[{new Date(entry.timestamp).toLocaleTimeString()}] {entry.channel} :: {entry.message}{entry.hash ? ` :: sha256 ${entry.hash}` : ""}</div>)}
      </div>
    </section>
  </div>;
}
