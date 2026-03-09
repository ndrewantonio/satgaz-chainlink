import { useState, type FormEvent } from "react";
import { ThreatType, THREAT_TYPE_LABELS } from "../types/payload";
import type { RequestPayload } from "../types/payload";

const CHAIN_OPTIONS = [
  "ethereum-testnet-sepolia",
  "ethereum-mainnet",
  "polygon-mainnet",
  "arbitrum-mainnet",
  "optimism-mainnet",
  "base-mainnet",
];

interface Props {
  payoutAddress: string;
  onSubmit: (payload: RequestPayload) => void;
  disabled?: boolean;
}

export function SubmissionForm({ payoutAddress, onSubmit, disabled }: Props) {
  const [targetProtocol, setTargetProtocol] = useState("");
  const [targetChain, setTargetChain] = useState("ethereum-testnet-sepolia");
  const [threatType, setThreatType] = useState<ThreatType>(ThreatType.RUG_PREP);
  const [description, setDescription] = useState("");
  const [txHashes, setTxHashes] = useState<string[]>([""]);
  const [contractAddresses, setContractAddresses] = useState<string[]>([""]);
  const [additionalData, setAdditionalData] = useState("");
  const [payout, setPayout] = useState(payoutAddress);

  const addTxHash = () => setTxHashes((h) => [...h, ""]);
  const removeTxHash = (i: number) =>
    setTxHashes((h) => h.filter((_, idx) => idx !== i));
  const updateTxHash = (i: number, v: string) =>
    setTxHashes((h) => h.map((x, idx) => (idx === i ? v : x)));

  const addContract = () => setContractAddresses((a) => [...a, ""]);
  const removeContract = (i: number) =>
    setContractAddresses((a) => a.filter((_, idx) => idx !== i));
  const updateContract = (i: number, v: string) =>
    setContractAddresses((a) => a.map((x, idx) => (idx === i ? v : x)));

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      targetProtocol: targetProtocol.trim(),
      targetChain: targetChain.trim(),
      threatType,
      evidence: {
        description: description.trim(),
        txHashes: txHashes.filter(Boolean),
        contractAddresses: contractAddresses.filter(Boolean),
        additionalData: additionalData.trim(),
      },
      payoutAddress: payout.trim(),
    });
  };

  return (
    <form className="submission-form" onSubmit={handleSubmit}>
      <div className="form-row-2">
        <div className="form-group">
          <label>Target Protocol</label>
          <input
            type="text"
            value={targetProtocol}
            onChange={(e) => setTargetProtocol(e.target.value)}
            placeholder="e.g. Uniswap V3"
            required
            disabled={disabled}
          />
        </div>

        <div className="form-group">
          <label>Target Chain</label>
          <input
            type="text"
            list="chain-options"
            value={targetChain}
            onChange={(e) => setTargetChain(e.target.value)}
            placeholder="e.g. ethereum-testnet-sepolia"
            required
            disabled={disabled}
          />
          <datalist id="chain-options">
            {CHAIN_OPTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="form-group">
        <label>Threat Type</label>
        <select
          value={threatType}
          onChange={(e) => setThreatType(e.target.value as ThreatType)}
          required
          disabled={disabled}
        >
          {Object.values(ThreatType).map((t) => (
            <option key={t} value={t}>
              {THREAT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="form-fieldset">
        <legend>Evidence</legend>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the threat in detail — what was observed, when, and how it indicates malicious activity."
            rows={4}
            required
            disabled={disabled}
          />
        </div>

        <div className="form-group">
          <label>Transaction Hashes</label>
          {txHashes.map((hash, i) => (
            <div key={i} className="list-row">
              <input
                type="text"
                value={hash}
                onChange={(e) => updateTxHash(i, e.target.value)}
                placeholder="0x..."
                style={{ fontFamily: "var(--mono)", fontSize: "0.85rem" }}
                disabled={disabled}
              />
              {txHashes.length > 1 && (
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeTxHash(i)}
                  disabled={disabled}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="btn-add"
            onClick={addTxHash}
            disabled={disabled}
          >
            + Add Hash
          </button>
        </div>

        <div className="form-group">
          <label>Contract Addresses</label>
          {contractAddresses.map((addr, i) => (
            <div key={i} className="list-row">
              <input
                type="text"
                value={addr}
                onChange={(e) => updateContract(i, e.target.value)}
                placeholder="0x..."
                style={{ fontFamily: "var(--mono)", fontSize: "0.85rem" }}
                disabled={disabled}
              />
              {contractAddresses.length > 1 && (
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeContract(i)}
                  disabled={disabled}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="btn-add"
            onClick={addContract}
            disabled={disabled}
          >
            + Add Address
          </button>
        </div>

        <div className="form-group">
          <label>Additional Data</label>
          <textarea
            value={additionalData}
            onChange={(e) => setAdditionalData(e.target.value)}
            placeholder="Any additional context, raw calldata, governance proposal IDs, links, etc."
            rows={3}
            disabled={disabled}
          />
        </div>
      </fieldset>

      <div className="form-group">
        <label>Payout Address</label>
        <input
          type="text"
          value={payout}
          onChange={(e) => setPayout(e.target.value)}
          placeholder="0x... (your address for bounty payout)"
          style={{ fontFamily: "var(--mono)", fontSize: "0.85rem" }}
          required
          disabled={disabled}
        />
        <span className="field-hint">
          Bounty will be sent here if the report is validated.
        </span>
      </div>

      <div className="btn-row">
        <button type="submit" className="btn-primary" disabled={disabled}>
          Review &amp; Pay →
        </button>
      </div>
    </form>
  );
}
