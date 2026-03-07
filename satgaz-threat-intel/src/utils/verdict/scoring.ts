import { VerdictOutcome, ConfidenceLevel } from "../../enums/outcome.enum";
import { ThreatType, ThreatLevel } from "../../enums/request.enum";
import { VerificationResult } from "../../types/results.type";

export function computeVerificationScore(
  verification: VerificationResult,
  aiResult: { threatConfirmed: boolean },
  tvlChange: number,
): number {
  let score = 0;

  // +30 if all claimed transactions exist on-chain
  if (verification.txsVerified) score += 30;

  // +30 if on-chain state matches the claimed threat
  if (verification.onChainStateMatches) score += 30;

  // +20 if the on-chain pattern matches the threat type
  if (verification.patternMatchesThreat) score += 20;

  // +10 if AI confirms the threat (enrichment only)
  if (aiResult.threatConfirmed) score += 10;

  // +10 if historical patterns support the claim
  if (verification.historicalPattern) score += 10;

  // Bonus/penalty from TVL data (max ±5)
  if (tvlChange < -50) score += 5; // Major TVL drop supports rug claim
  if (tvlChange > 100) score -= 5; // TVL growing — less likely rug

  return Math.max(0, Math.min(100, score));
}

export function determineOutcome(score: number): VerdictOutcome {
  if (score >= 60) return VerdictOutcome.VALID;
  if (score >= 40) return VerdictOutcome.INCONCLUSIVE;
  return VerdictOutcome.INVALID;
}

export function determineConfidence(score: number): ConfidenceLevel {
  if (score >= 80) return ConfidenceLevel.HIGH;
  if (score >= 60) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

export function determineThreatLevel(
  threatType: ThreatType,
  verification: VerificationResult,
): ThreatLevel {
  if (
    (threatType === ThreatType.RUG_PREP ||
      threatType === ThreatType.FUND_DRAIN) &&
    verification.patternMatchesThreat
  ) {
    return ThreatLevel.CRITICAL;
  }
  if (threatType === ThreatType.ADMIN_KEY && verification.onChainStateMatches) {
    return ThreatLevel.HIGH;
  }
  if (
    threatType === ThreatType.ORACLE_MANIP &&
    verification.patternMatchesThreat
  ) {
    return ThreatLevel.HIGH;
  }
  if (
    threatType === ThreatType.UPGRADE_VULN &&
    verification.onChainStateMatches
  ) {
    return ThreatLevel.MEDIUM;
  }
  return ThreatLevel.LOW;
}
