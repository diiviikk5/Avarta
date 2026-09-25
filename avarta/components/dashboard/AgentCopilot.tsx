"use client";

import { useState } from "react";
import { ThreatObject, AgentChatMessage } from "@/types/threat";
import { Send, Check, X, Terminal, AlertTriangle } from "lucide-react";

interface AgentCopilotProps {
  threat: ThreatObject;
}

export default function AgentCopilot({ threat }: AgentCopilotProps) {
  const [messages, setMessages] = useState<AgentChatMessage[]>([
    {
      id: "msg-1",
      sender: "agent",
      timestamp: "14:02",
      content: `Avarta Meteorological Intelligence Agent initialized. I continuously evaluate 4D threat objects, ensemble track divergence, and physics-constrained 5 km reconstructions. Currently monitoring ${threat.id} (${threat.name}). How can I assist you with operational meteorological analysis or disaster response directives?`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const predefinedPrompts = [
    "Analyze ensemble track divergence & uncertainty envelope",
    "Inspect physics guard mass & moisture convergence",
    "Draft NDRF Level-3 emergency evacuation directive"
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

      if (query.toLowerCase().includes("ensemble") || query.toLowerCase().includes("divergence")) {
        agentMsg = {
          id: `agt-${Date.now()}`,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: `Invoked \`get_trajectory("${threat.id}")\`. Ensemble members 1, 2, and 6 show tight clustering with northward recurvature toward the West Bengal-Odisha coast at T+38h. ECMWF Ens #3 and GEFS #5 exhibit an eastward shift toward the Sundarbans (+58 km), producing a 95% uncertainty envelope radius of 88 km at 48 hours. Consensus peak intensity remains severe at ${threat.intensity_current} ${threat.intensity_unit}.`,
          tool_call: {
            tool_name: "get_trajectory",
            arguments: { threat_id: threat.id, confidence_level: 0.95 },
            result: {
              consensus_bearing: threat.bearing_deg,
              cone_radius_48h_km: 88,
              dominant_members: ["NCMRWF EPS #1", "UKMO Pert #6"]
            }
          }
        };
      } else if (query.toLowerCase().includes("physics") || query.toLowerCase().includes("guard") || query.toLowerCase().includes("convergence")) {
        agentMsg = {
          id: `agt-${Date.now()}`,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: `Invoked \`validate_physics_guard("${threat.id}")\`. All physical conservation constraints pass with a composite score of ${threat.physics_guard.composite_physics_score}%. Moisture flux convergence ∇·(qv) is measured at ${threat.physics_guard.moisture_flux_convergence.val.toExponential(2)} g/(kg·s), safely exceeding the critical threshold of ${threat.physics_guard.moisture_flux_convergence.threshold.toExponential(2)}. Mass continuity residual is bounded at ${(threat.physics_guard.mass_continuity.error_percent * 100).toFixed(2)}% (< 5% tolerance).`,
          tool_call: {
            tool_name: "validate_physics_guard",
            arguments: { threat_id: threat.id, subgrid_res_km: 5.0 },
            result: threat.physics_guard
          }
        };
      } else if (query.toLowerCase().includes("evacuation") || query.toLowerCase().includes("ndrf") || query.toLowerCase().includes("directive") || query.toLowerCase().includes("alert")) {
        agentMsg = {
          id: `agt-${Date.now()}`,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: `Invoked \`prepare_cap_alert("${threat.id}")\`. Based on the 5 km reconstructed peak of ${threat.impact.peak_metric_value} ${threat.impact.peak_metric_unit} and an exposed population of ${(threat.impact.exposed_population / 1000000).toFixed(2)}M across the ${threat.impact.primary_zone_name}, I have prepared a Common Alerting Protocol (CAP 1.2) emergency directive for NDRF Level-3 mobilization.`,
          tool_call: {
            tool_name: "generate_cap_alert",
            arguments: {
              threat_id: threat.id,
              urgency: "Immediate",
              area_radius_km: 5.0,
              target_zone: threat.impact.primary_zone_name
            }
          },
          pending_approval: {
            action_type: "DISPATCH_NATIONAL_ALERT",
            details: `Deploy 12 NDRF disaster response battalions to ${threat.impact.primary_zone_name}. Activate emergency warning protocol across 5 km pinpoint radius around [${threat.impact.coordinates.lat}°N, ${threat.impact.coordinates.lon}°E].`,
            threat_id: threat.id,
            target_agency: "NDRF / NDMA Command Center"
          }
        };
      } else {
        agentMsg = {
          id: `agt-${Date.now()}`,
          sender: "agent",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          content: `Invoked \`get_threat("${threat.id}")\`. ${threat.name} is currently in the ${threat.status} stage with an EFI anomaly index of +${threat.efi_index.toFixed(2)} (${threat.historical_percentile}th climatological percentile). Threat-first compute crop saved ${threat.compute_region.grid_cells_saved_percent}% computation by focusing generative diffusion strictly on the active 4D bounding box. Peak 5km reconstructed magnitude is ${threat.downscaling.avarta_5km_peak} ${threat.downscaling.unit}.`,
          tool_call: {
            tool_name: "get_threat",
            arguments: { threat_id: threat.id }
          }
        };
      }

      setMessages((prev) => [...prev, agentMsg]);
      setIsProcessing(false);
    }, 800);
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
    <div className="p-6 sm:p-8 bg-[#0c0a09] space-y-6 text-stone-100">
      {/* Editorial Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-[#292524]">
        <div>
          <span className="text-[11px] font-medium tracking-wider uppercase text-stone-400 block mb-1">
            Agentic Response Harness · LangGraph Intelligence Core
          </span>
          <h2
            className="text-2xl sm:text-3xl font-light text-white tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Meteorological Copilot & Decision Protocol
          </h2>
          <p className="text-sm text-stone-400 max-w-2xl mt-1 leading-relaxed">
            The agent operates strictly on structured Threat Intelligence Objects rather than raw unconstrained tensors, ensuring explainable reasoning with mandatory human-in-the-loop sign-off for national alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#141210] px-4 py-2 rounded-full border border-stone-800 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-stone-200">
            Human-in-the-Loop Protocol Enforced
          </span>
        </div>
      </div>

      {/* Suggested Inquiries */}
      <div className="flex flex-wrap gap-2">
        {predefinedPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSendMessage(prompt)}
            className="text-xs font-medium bg-[#141210] hover:bg-[#1c1917] border border-[#292524] hover:border-stone-700 text-stone-300 px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Dialogue Thread (Dark) */}
      <div className="bg-[#141210] rounded-[20px] border border-[#292524] shadow-xs p-6 max-h-[460px] overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-[16px] space-y-2.5 ${
              msg.sender === "user"
                ? "bg-[#1c1917] border border-stone-800 ml-12"
                : "bg-[#0f0e0d] border border-stone-800/80 mr-12"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-stone-400">
              <span className="font-semibold text-white">
                {msg.sender === "user" ? "Forecaster In-Charge" : "Avarta Weather Agent"}
              </span>
              <span>{msg.timestamp}</span>
            </div>

            <p className="text-sm text-stone-200 leading-relaxed">
              {msg.content}
            </p>

            {/* Tool Invocations */}
            {msg.tool_call && (
              <div className="bg-black/50 p-3 rounded-lg border border-stone-800 text-xs font-mono space-y-1">
                <div className="text-white font-semibold flex items-center gap-1.5">
                  <Terminal size={13} className="text-sky-400" />
                  <span>Tool: {msg.tool_call.tool_name}()</span>
                </div>
                <div className="text-stone-400 text-[11px]">
                  Parameters: {JSON.stringify(msg.tool_call.arguments)}
                </div>
              </div>
            )}

            {/* Human-in-the-Loop Review Box (Dark) */}
            {msg.pending_approval && (
              <div className="bg-[#1c1917] border-2 border-white p-5 rounded-[16px] shadow-xl space-y-3 mt-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider">
                  <AlertTriangle size={15} className="text-amber-400" />
                  <span>Executive Review Required Prior to External Transmission</span>
                </div>
                <p className="text-sm text-stone-200 font-medium leading-relaxed">
                  {msg.pending_approval.details}
                </p>
                <div className="text-xs text-stone-400">
                  Destination Agency: <strong className="text-white">{msg.pending_approval.target_agency}</strong>
                </div>

                {msg.pending_approval.approved === undefined ? (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleApproveAction(msg.id)}
                      className="px-5 py-2.5 rounded-full bg-white text-black hover:bg-stone-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                    >
                      <Check size={14} />
                      <span>Approve & Broadcast Directive</span>
                    </button>
                    <button
                      onClick={() => handleRejectAction(msg.id)}
                      className="px-5 py-2.5 rounded-full bg-transparent hover:bg-stone-800 text-white border border-stone-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <X size={14} />
                      <span>Reject / Revise Directive</span>
                    </button>
                  </div>
                ) : msg.pending_approval.approved ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 px-3.5 py-2 rounded-full border border-emerald-800/40 w-fit">
                    <Check size={14} />
                    <span>Approved & Dispatched to NDRF Command at {msg.pending_approval.executed_at}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-stone-400 bg-stone-800/80 px-3.5 py-2 rounded-full border border-stone-700 w-fit">
                    <X size={14} />
                    <span>Rejected by Forecaster at {msg.pending_approval.executed_at}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="text-xs text-stone-400 flex items-center gap-2 p-2">
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
          placeholder="Consult Avarta Agent on ensemble trajectories, physics validation, or NDRF directives..."
          className="flex-1 bg-[#141210] border border-[#292524] rounded-full px-5 py-3 text-sm text-white placeholder:text-stone-500 outline-none focus:border-white shadow-xs"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isProcessing}
          className="bg-white hover:bg-stone-200 text-black disabled:opacity-50 px-6 py-3 rounded-full text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
        >
          <Send size={14} />
          <span>Submit</span>
        </button>
      </div>
    </div>
  );
}
