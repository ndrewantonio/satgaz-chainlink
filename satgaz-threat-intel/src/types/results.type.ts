import { ConfidenceLevel, VerdictOutcome } from "../enums/outcome.enum";
import { ThreatLevel, ThreatType } from "../enums/request.enum";

export type VerificationResult = {
  txsVerified: boolean;
  onChainStateMatches: boolean;
  patternMatchesThreat: boolean;
  aiConfirmsThreat: boolean;
  historicalPattern: boolean;
  details: string;
};

export type ThreatVerdict = {
  targetProtocol: string;
  targetChain: string;
  threatType: ThreatType;
  threatLevel: ThreatLevel;
  confidence: ConfidenceLevel;
  outcome: VerdictOutcome;
  score: number;
  timestamp: number;
  payoutAddress: string;
  bountyAmount: number;
};

export type PaymentReceipt = {
  /** Address that paid the submission fee */
  submitter: string;
  /** Unique payment ID (keccak256 of the payload) supplied to the contract */
  paymentId: string;
  /** Fee paid in token base units (as string to avoid BigInt serialization issues) */
  feePaid: string;
  /** Block timestamp of the payment */
  paymentTimestamp: number;
  /** Transaction hash of the SubmissionPaid event */
  txHash: string;
  /** Always true when this receipt is returned */
  authorized: boolean;
};
