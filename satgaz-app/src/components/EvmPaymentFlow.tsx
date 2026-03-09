import { useState } from "react";
import { useAccount } from "wagmi";
import { usePayment, type PaymentResult } from "../hooks/usePayment";
import type { RequestPayload } from "../types/payload";
import { WORKFLOW_HTTP_URL } from "../lib/contracts";

type Step = "idle" | "processing" | "paid" | "triggering" | "done" | "error";

interface Props {
  payload: RequestPayload;
  onReset: () => void;
}

export function EvmPaymentFlow({ payload, onReset }: Props) {
  const { address } = useAccount();
  const { pay } = usePayment();
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [triggerResponse, setTriggerResponse] = useState<string | null>(null);

  const handlePay = async () => {
    if (!address) return;
    try {
      setError(null);
      setStep("processing");
      const res = await pay(payload);
      setResult(res);
      setStep("paid");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  };

  // Manual HTTP fallback: sends payload + paymentTxHash to the workflow HTTP trigger.
  // The HTTP handler will verify the payment on-chain, then run the full analysis pipeline.
  const handleManualTrigger = async () => {
    if (!result) return;
    setStep("triggering");
    try {
      const body: RequestPayload = { ...payload, paymentTxHash: result.txHash };
      const res = await fetch(WORKFLOW_HTTP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      setTriggerResponse(
        res.ok
          ? `✓ ${text || "Workflow accepted the submission"}`
          : `HTTP ${res.status}: ${text}`,
      );
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("error");
    }
  };

  const copySimulateCmd = () => {
    navigator.clipboard.writeText(
      "cd satgaz-threat-intel && bun simulate:staging",
    );
  };

  if (step === "idle") {
    return (
      <div className="flow-panel">
        <h3>Step 1 — Pay Submission Fee</h3>
        <p className="hint">
          Calls <code>SubmissionEscrow.pay()</code> on Sepolia, emitting a{" "}
          <code>SubmissionPaid</code> event on-chain. If the CRE workflow is
          deployed and running, it picks up the event automatically. Use{" "}
          <strong>Step 2</strong> to trigger manually when simulating locally.
        </p>
        <div className="payload-preview">
          <span className="label">Payload</span>
          <pre>{JSON.stringify(payload, null, 2)}</pre>
        </div>
        <div className="btn-row">
          <button className="btn-secondary" onClick={onReset}>
            ← Edit Form
          </button>
          <button className="btn-primary" onClick={handlePay}>
            Pay &amp; Submit
          </button>
        </div>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="flow-panel">
        <div className="status-indicator pending">
          <span className="spinner" />
          <span>Processing… confirm the wallet prompt.</span>
        </div>
      </div>
    );
  }

  if (step === "paid" && result) {
    return (
      <div className="flow-panel">
        <div className="status-indicator success">
          ✓ Payment Confirmed — SubmissionPaid event emitted
        </div>

        <div className="result-grid">
          <div className="result-row">
            <span className="result-label">Tx Hash</span>
            <a
              href={`https://base-sepolia.blockscout.com/tx/${result.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="hash"
            >
              {result.txHash}
            </a>
          </div>
          <div className="result-row">
            <span className="result-label">Payment ID</span>
            <span className="hash">{result.paymentId}</span>
          </div>
          <div className="result-row">
            <span className="result-label">Submitter</span>
            <span className="hash">{result.submitter}</span>
          </div>
          <div className="result-row">
            <span className="result-label">Fee Paid</span>
            <span>{result.feePaid.toString()} wei</span>
          </div>
        </div>

        <div className="step2-section">
          <h3>Step 2 — Trigger Workflow</h3>
          <p className="hint">
            The event is now on-chain. The CRE EVM Log Trigger will detect it
            automatically if the workflow is deployed. To simulate locally, run:
          </p>
          <div className="simulate-cmd">
            <code>cd satgaz-threat-intel &amp;&amp; bun simulate:staging</code>
            <button
              className="btn-copy"
              onClick={copySimulateCmd}
              title="Copy to clipboard"
            >
              Copy
            </button>
          </div>
          <p className="hint" style={{ marginTop: "14px" }}>
            Alternatively, trigger the workflow via its HTTP endpoint (verifies
            the payment tx on-chain, then runs the full analysis):
          </p>
          <div className="btn-row" style={{ marginTop: "12px" }}>
            <button className="btn-secondary" onClick={onReset}>
              New Submission
            </button>
            <button className="btn-primary" onClick={handleManualTrigger}>
              Manual HTTP Trigger →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "triggering") {
    return (
      <div className="flow-panel">
        <div className="status-indicator pending">
          <span className="spinner" />
          <span>Sending to workflow HTTP trigger…</span>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flow-panel">
        <div className="status-indicator success">✓ Workflow Triggered</div>
        {triggerResponse && (
          <pre className="response-box">{triggerResponse}</pre>
        )}
        <button
          className="btn-secondary"
          onClick={onReset}
          style={{ marginTop: "16px" }}
        >
          New Submission
        </button>
      </div>
    );
  }

  // error
  return (
    <div className="flow-panel">
      <div className="status-indicator error">✕ Error</div>
      <pre className="response-box error-box">{error}</pre>
      <div className="btn-row" style={{ marginTop: "12px" }}>
        <button className="btn-secondary" onClick={onReset}>
          ← Edit Form
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            setStep("idle");
            setError(null);
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
