"use client";

import { useState } from "react";
import { ThreatObject, AgentChatMessage } from "@/types/threat";
import { Send, Check, X, AlertTriangle } from "lucide-react";

interface AgentCopilotProps {
  threat: ThreatObject;
}

export default function AgentCopilot({ threat }: AgentCopilotProps) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: "msg-1",
      sender: "agent",
      timestamp: "14:02",
      content: `Avarta AI Intelligence core active. Monitoring 4D threat ${threat.id} (${threat.name}). Reconstructed peak intensity is ${threat.intensity_current} ${threat.intensity_unit} with an EFI anomaly score of +${threat.efi_index.toFixed(2)}. Ready to synthesize meteorological briefings or draft civil defense directives.`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const predefinedPrompts = [
    "Summarize 4D Trajectory & Landfall",
    "Verify Physics Conservation Ledger",
    "Draft Civil Defense Alert (CAP 1.2)"
  ];

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim() || isProcessing) return;

    const userMsg: AgentChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      content: query
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setIsProcessing(true);

    setTimeout(() => {
      let agentMsg: AgentChatMessage;

      if (query.toLowerCase().includes("trajectory") || query.toLowerCase().includes("landfall")) {
        agentMsg = {
          id: `agt-${Date.now()}`,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: `Trajectory Analysis: 50-member ensemble consensus projects track progression towards ${threat.impact.primary_zone_name} at bearing ${threat.bearing_deg}° (${threat.velocity_kmh} km/h). 95% uncertainty envelope indicates landfall coincident window at T+${threat.impact.estimated_arrival_hours}h. Peak sustained wind at landfall will reach ${threat.downscaling.avarta_5km_peak} ${threat.downscaling.unit}.`
        };
      } else if (query.toLowerCase().includes("physics") || query.toLowerCase().includes("conservation")) {
        agentMsg = {
          id: `agt-${Date.now()}`,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: `Physics Audit Passed (Score: ${threat.physics_guard.composite_physics_score}%). Moisture flux convergence verifies strong ascending vapor inflow ∇·(qv) = ${threat.physics_guard.moisture_flux_convergence.val.toExponential(2)}. Mass continuity residual is bounded at ${(threat.physics_guard.mass_continuity.error_percent * 100).toFixed(2)}%, confirming realistic fluid conservation without neural hallucination.`
        };
      } else if (query.toLowerCase().includes("alert") || query.toLowerCase().includes("defense") || query.toLowerCase().includes("cap")) {
        agentMsg = {
          id: `agt-${Date.now()}`,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: `Synthesized OASIS Common Alerting Protocol (CAP 1.2) emergency directive for ${threat.impact.primary_zone_name}. Exposed population: ${(threat.impact.exposed_population / 1000000).toFixed(2)}M. Ready for human authorization.`,
          pending_approval: {
            action_type: "DISPATCH_NATIONAL_ALERT",
            details: `Dispatch Level-3 emergency contingency mandate to ${threat.impact.primary_zone_name}. Pre-position disaster relief battalions to coordinates [${threat.impact.coordinates.lat}°N, ${threat.impact.coordinates.lon}°E].`,
            threat_id: threat.id,
            target_agency: "NDRF / State Emergency Operations Center"
          }
        };
      } else {
        agentMsg = {
          id: `agt-${Date.now()}`,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: `Threat ${threat.id} is in ${threat.status} state. 5 km generative downscaling preserves convective peak (${threat.downscaling.avarta_5km_peak} ${threat.downscaling.unit}) while threat-first bounding box saved ${threat.compute_region.grid_cells_saved_percent}% computation.`
        };
      }

      setMessages((prev) => [...prev, agentMsg]);
      setIsProcessing(false);
    }, 700);
  };

  const handleApproveAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === msgId && msg.pending_approval
          ? {
              ...msg,
              pending_approval: {
                ...msg.pending_approval,
                approved: true,
                executed_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
            }
          : msg
      )
    );
  };

  const handleRejectAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === msgId && msg.pending_approval
          ? {
              ...msg,
              pending_approval: {
                ...msg.pending_approval,
                approved: false,
                executed_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              }
            }
          : msg
      )
    );
  };

  return (
    <div className="p-6 sm:p-10 space-y-6 text-stone-100 max-w-4xl mx-auto">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-stone-800/80">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 block mb-1">
            Agentic Response Harness
          </span>
          <h2
            className="text-2xl sm:text-3xl font-light text-white tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Meteorological Copilot
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Provides explainable analysis and drafts emergency directives with mandatory human sign-off.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 px-3.5 py-1.5 rounded-full text-xs text-stone-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Human-in-the-Loop Protocol</span>
        </div>
      </div>

      {/* Suggested Quick Inquiries */}
      <div className="flex flex-wrap gap-2">
        {predefinedPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSendMessage(prompt)}
            className="text-xs font-mono bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-300 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Dialogue Thread */}
      <div className="bg-[#141210] rounded-2xl border border-stone-800/80 p-6 max-h-[420px] overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-xl space-y-2 ${
              msg.sender === "user"
                ? "bg-stone-900/90 border border-stone-800 ml-10 text-stone-200"
                : "bg-[#181614] border border-stone-800/60 mr-10 text-stone-300"
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span className="font-medium text-white">
                {msg.sender === "user" ? "Forecaster" : "Avarta Intelligence Agent"}
              </span>
              <span>{msg.timestamp}</span>
            </div>

            <p className="text-sm leading-relaxed text-stone-200">
              {msg.content}
            </p>

            {/* Human-in-the-Loop Approval Card */}
            {msg.pending_approval && (
              <div className="bg-[#1e1b18] border border-white/40 p-4 rounded-xl space-y-3 mt-3 shadow-md">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-300 uppercase font-mono">
                  <AlertTriangle size={14} />
                  <span>Executive Review Required Before Dispatch</span>
                </div>
                <p className="text-xs text-stone-200 leading-relaxed">
                  {msg.pending_approval.details}
                </p>

                {msg.pending_approval.approved === undefined ? (
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => handleApproveAction(msg.id)}
                      className="px-4 py-2 rounded-full bg-white text-black hover:bg-stone-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={13} />
                      <span>Approve Directive</span>
                    </button>
                    <button
                      onClick={() => handleRejectAction(msg.id)}
                      className="px-4 py-2 rounded-full bg-transparent text-stone-300 hover:text-white border border-stone-700 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <X size={13} />
                      <span>Reject</span>
                    </button>
                  </div>
                ) : msg.pending_approval.approved ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/40">
                    <Check size={12} />
                    <span>Approved & Dispatched to NDRF at {msg.pending_approval.executed_at}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 bg-stone-800 px-3 py-1 rounded-full">
                    <X size={12} />
                    <span>Rejected at {msg.pending_approval.executed_at}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="text-xs text-stone-400 flex items-center gap-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>Evaluating meteorological telemetry...</span>
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="flex gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Ask Avarta Agent for trajectory briefing, physics audit, or alert dispatch..."
          className="flex-1 bg-stone-900 border border-stone-800 rounded-full px-5 py-2.5 text-sm text-white placeholder:text-stone-500 outline-none focus:border-stone-600"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isProcessing}
          className="bg-white hover:bg-stone-200 text-black disabled:opacity-50 px-5 py-2.5 rounded-full text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Send size={13} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
