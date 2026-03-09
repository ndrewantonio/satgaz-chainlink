import { useState } from "react";
import { useAccount } from "wagmi";
import { usePayment, type PaymentResult } from "../hooks/usePayment";
import type { RequestPayload } from "../types/payload";
import { WORKFLOW_HTTP_URL } from "../lib/contracts";

type Step = "idle" | "processing" | "paid" | "submitting" | "done" | "error";

interface Props {
  payload: RequestPayload;
  onReset: () => void;
}

export function HttpPaymentFlow({ payload, onReset }: Props) {
  const { address } = useAccount();
  const { pay } = usePayment();
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workflowResponse, setWorkflowResponse] = useState<string | null>(null);

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

  const handleSubmitToWorkflow = async () => {
    if (!result) return;
    setStep("submitting");
    try {
      // Include paymentTxHash so the HTTP handler can verify payment on-chain
      const body: RequestPayload = { ...payload, paymentTxHash: result.txHash };
      const res = await fetch(WORKFLOW_HTTP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      setWorkflowResponse(
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

  if (step === "idle") {
    return (
      <div className="flow-panel">
        <h3>Step 1 — Pay Submission Fee</h3>
        <p className="hint">
          Calls <code>SubmissionEscrow.pay()</code> on Base Sepolia. The tx hash
          is then sent alongside the payload to the workflow's HTTP trigger,
          which verifies payment on-chain before running threat analysis.
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
            Pay &amp; Continue
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
        <div className="status-indicator success">✓ Payment Confirmed</div>

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
          <h3>Step 2 — Submit to Workflow</h3>
          <p className="hint">
            Sends the full payload + payment tx hash to the workflow HTTP
            trigger at <code>{WORKFLOW_HTTP_URL}</code>. Make sure{" "}
            <code>bun simulate:staging</code> is running in the{" "}
            <code>satgaz-threat-intel</code> directory.
          </p>
          <div className="btn-row" style={{ marginTop: "12px" }}>
            <button className="btn-secondary" onClick={onReset}>
              New Submission
            </button>
            <button className="btn-primary" onClick={handleSubmitToWorkflow}>
              Submit to Workflow →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "submitting") {
    return (
      <div className="flow-panel">
        <div className="status-indicator pending">
          <span className="spinner" />
          <span>Submitting to workflow HTTP trigger…</span>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flow-panel">
        <div className="status-indicator success">✓ Workflow Triggered</div>
        {workflowResponse && (
          <pre className="response-box">{workflowResponse}</pre>
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
