import type { FlowType } from "../types/payload";

interface Props {
  value: FlowType;
  onChange: (flow: FlowType) => void;
}

export function FlowToggle({ value, onChange }: Props) {
  return (
    <div className="flow-toggle">
      <button
        className={`flow-btn${value === "evm" ? " active" : ""}`}
        onClick={() => onChange("evm")}
      >
        EVM Log Trigger
      </button>
      <button
        className={`flow-btn${value === "http" ? " active" : ""}`}
        onClick={() => onChange("http")}
      >
        HTTP Trigger
      </button>
    </div>
  );
}
