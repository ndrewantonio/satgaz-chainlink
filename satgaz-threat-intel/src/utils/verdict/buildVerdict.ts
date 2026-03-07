import { BOUNTY_AMOUNTS } from "../../constants/encodings";
import { VerdictOutcome } from "../../enums/outcome.enum";
import { RequestPayload } from "../../types/payload.type";
import { VerificationResult, ThreatVerdict } from "../../types/results.type";
import {
  computeVerificationScore,
  determineConfidence,
  determineOutcome,
  determineThreatLevel,
} from "./scoring";

export function buildVerdict(
  submission: RequestPayload,
  verification: VerificationResult,
  aiResult: { threatConfirmed: boolean },
  tvlChange: number,
  nowMs: number,
): ThreatVerdict {
  const score = computeVerificationScore(verification, aiResult, tvlChange);
  const outcome = determineOutcome(score);
  const confidence = determineConfidence(score);
  const threatLevel = determineThreatLevel(submission.threatType, verification);
  const bountyAmount =
    outcome === VerdictOutcome.VALID ? Number(BOUNTY_AMOUNTS[threatLevel]) : 0;

  return {
    targetProtocol: submission.targetProtocol,
    targetChain: submission.targetChain,
    threatType: submission.threatType,
    threatLevel,
    confidence,
    outcome,
    score,
    timestamp: Math.floor(nowMs / 1000),
    payoutAddress: submission.payoutAddress,
    bountyAmount,
  };
}
