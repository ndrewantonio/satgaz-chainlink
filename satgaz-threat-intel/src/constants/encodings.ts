import { ConfidenceLevel } from "../enums/outcome.enum";
import { ThreatType, ThreatLevel } from "../enums/request.enum";

export const THREAT_TYPE_ENUM: Record<ThreatType, number> = {
  [ThreatType.RUG_PREP]: 0,
  [ThreatType.ADMIN_KEY]: 1,
  [ThreatType.FUND_DRAIN]: 2,
  [ThreatType.UPGRADE_VULN]: 3,
  [ThreatType.ORACLE_MANIP]: 4,
};

export const THREAT_LEVEL_ENUM: Record<ThreatLevel, number> = {
  [ThreatLevel.CRITICAL]: 0,
  [ThreatLevel.HIGH]: 1,
  [ThreatLevel.MEDIUM]: 2,
  [ThreatLevel.LOW]: 3,
};

export const CONFIDENCE_ENUM: Record<ConfidenceLevel, number> = {
  [ConfidenceLevel.HIGH]: 0,
  [ConfidenceLevel.MEDIUM]: 1,
  [ConfidenceLevel.LOW]: 2,
};

/** Bounty amounts in USDC base units (6 decimals) */
export const BOUNTY_AMOUNTS: Record<ThreatLevel, bigint> = {
  [ThreatLevel.CRITICAL]: 500_000_000n, // 500 USDC
  [ThreatLevel.HIGH]: 250_000_000n, // 250 USDC
  [ThreatLevel.MEDIUM]: 100_000_000n, // 100 USDC
  [ThreatLevel.LOW]: 0n, // No bounty for LOW
};
