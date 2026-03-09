import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { FlowToggle } from "./components/FlowToggle";
import { SubmissionForm } from "./components/SubmissionForm";
import { EvmPaymentFlow } from "./components/EvmPaymentFlow";
import { HttpPaymentFlow } from "./components/HttpPaymentFlow";
import type { RequestPayload, FlowType } from "./types/payload";

const EVM_STEPS = [
  {
    label: "Fill the form",
    detail: "Describe the threat and provide evidence.",
  },
  {
    label: "Approve token spend",
    detail: "Allow SubmissionEscrow to pull the submission fee.",
  },
  {
    label: "Pay on-chain",
    detail: (
      <>
        Calls <code>SubmissionEscrow.pay()</code> — emits{" "}
        <code>SubmissionPaid</code>.
      </>
    ),
  },
  {
    label: "CRE picks up the event",
    detail:
      "EVM Log Trigger fires automatically when the workflow is deployed.",
  },
  {
    label: "Manual simulation",
    detail: (
      <>
        Run <code>bun simulate:staging</code> or use the HTTP button to test
        locally.
      </>
    ),
  },
];

const HTTP_STEPS = [
  {
    label: "Fill the form",
    detail: "Describe the threat and provide evidence.",
  },
  {
    label: "Approve token spend",
    detail: "Allow SubmissionEscrow to pull the submission fee.",
  },
  {
    label: "Pay on-chain",
    detail: (
      <>
        Calls <code>SubmissionEscrow.pay()</code> — records tx hash.
      </>
    ),
  },
  {
    label: "Trigger workflow",
    detail: "Payload + tx hash are POSTed to the HTTP trigger endpoint.",
  },
  {
    label: "On-chain verification",
    detail:
      "Workflow verifies the payment transaction before running analysis.",
  },
];

export default function App() {
  const { isConnected, address } = useAccount();
  const [flowType, setFlowType] = useState<FlowType>("evm");
  const [pendingPayload, setPendingPayload] = useState<RequestPayload | null>(
    null,
  );

  const handleFlowChange = (f: FlowType) => {
    setFlowType(f);
    setPendingPayload(null);
  };

  const steps = flowType === "evm" ? EVM_STEPS : HTTP_STEPS;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="logo">SatGaz</span>
          <span className="header-subtitle">Threat Intel Simulator</span>
        </div>
        <ConnectButton />
      </header>

      <main className="app-main">
        {!isConnected ? (
          <div className="landing">
            <div className="landing-icon">🛡️</div>
            <h1>Submit a Threat Report</h1>
            <p>
              Connect your wallet to submit a threat intelligence report and
              trigger the Chainlink CRE workflow for on-chain analysis.
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div className="workspace">
            {/* ── Left sidebar ── */}
            <aside className="workspace-sidebar">
              <div className="sidebar-section">
                <div className="sidebar-section-title">Trigger Mode</div>
                <div
                  className="sidebar-section-body"
                  style={{ padding: "10px" }}
                >
                  <FlowToggle value={flowType} onChange={handleFlowChange} />
                </div>
              </div>

              <div className="sidebar-section">
                <div className="sidebar-section-title">About this mode</div>
                <div className="sidebar-section-body">
                  <div className="flow-description">
                    {flowType === "evm" ? (
                      <p>
                        <strong>EVM Log Trigger:</strong> Pay on-chain →{" "}
                        <code>SubmissionPaid</code> event emitted → the CRE
                        workflow picks it up automatically when deployed on a
                        Chainlink DON. Use the manual HTTP button for local
                        simulation.
                      </p>
                    ) : (
                      <p>
                        <strong>HTTP Trigger:</strong> Pay on-chain → submit
                        payload + tx hash directly to the workflow's HTTP
                        endpoint → workflow verifies the payment on-chain before
                        running threat analysis.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="sidebar-section sidebar-steps">
                <div className="sidebar-section-title">How it works</div>
                <div className="sidebar-section-body">
                  <ol className="steps-list">
                    {steps.map((s, i) => (
                      <li className="step-item" key={i}>
                        <span className="step-num">{i + 1}</span>
                        <span className="step-text">
                          <strong>{s.label}</strong> — {s.detail}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </aside>

            {/* ── Main panel ── */}
            <div className="workspace-body">
              {!pendingPayload ? (
                <SubmissionForm
                  payoutAddress={address ?? ""}
                  onSubmit={setPendingPayload}
                />
              ) : flowType === "evm" ? (
                <EvmPaymentFlow
                  payload={pendingPayload}
                  onReset={() => setPendingPayload(null)}
                />
              ) : (
                <HttpPaymentFlow
                  payload={pendingPayload}
                  onReset={() => setPendingPayload(null)}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
