import { ThreatType } from "../enums/request.enum";
import { RequestPayload } from "../types/payload.type";

const HEX_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HEX_TX_RE = /^0x[0-9a-fA-F]{64}$/;
const VALID_THREAT_TYPES = new Set(Object.values(ThreatType));

export function validateSubmission(sub: RequestPayload): string | null {
  if (!sub.targetProtocol || !HEX_ADDRESS_RE.test(sub.targetProtocol)) {
    return "Invalid targetProtocol address";
  }
  if (!sub.targetChain || sub.targetChain.length === 0) {
    return "Missing targetChain";
  }
  if (!VALID_THREAT_TYPES.has(sub.threatType)) {
    return `Invalid threatType: ${sub.threatType}`;
  }
  if (!sub.evidence) {
    return "Missing evidence object";
  }
  if (
    !sub.evidence.description ||
    sub.evidence.description.trim().length < 10
  ) {
    return "Evidence description too short (min 10 chars)";
  }
  if (
    !Array.isArray(sub.evidence.txHashes) ||
    sub.evidence.txHashes.length === 0
  ) {
    return "At least one txHash is required";
  }
  for (const tx of sub.evidence.txHashes) {
    if (!HEX_TX_RE.test(tx)) {
      return `Invalid txHash: ${tx}`;
    }
  }
  if (
    !Array.isArray(sub.evidence.contractAddresses) ||
    sub.evidence.contractAddresses.length === 0
  ) {
    return "At least one contractAddress is required";
  }
  for (const addr of sub.evidence.contractAddresses) {
    if (!HEX_ADDRESS_RE.test(addr)) {
      return `Invalid contractAddress: ${addr}`;
    }
  }
  if (!sub.payoutAddress || !HEX_ADDRESS_RE.test(sub.payoutAddress)) {
    return "Invalid payoutAddress";
  }
  if (sub.paymentTxHash !== undefined && !HEX_TX_RE.test(sub.paymentTxHash)) {
    return "Invalid paymentTxHash (must be 0x + 64 hex chars)";
  }
  return null;
}
