// Use const object + union type to satisfy erasableSyntaxOnly (no enums)
export const ThreatType = {
  RUG_PREP: "RUG_PREP",
  ADMIN_KEY: "ADMIN_KEY",
  FUND_DRAIN: "FUND_DRAIN",
  UPGRADE_VULN: "UPGRADE_VULN",
  ORACLE_MANIP: "ORACLE_MANIP",
} as const;
export type ThreatType = (typeof ThreatType)[keyof typeof ThreatType];

export const THREAT_TYPE_LABELS: Record<ThreatType, string> = {
  [ThreatType.RUG_PREP]: "Rug Preparation",
  [ThreatType.ADMIN_KEY]: "Admin Key Compromise",
  [ThreatType.FUND_DRAIN]: "Fund Drain",
  [ThreatType.UPGRADE_VULN]: "Upgrade Vulnerability",
  [ThreatType.ORACLE_MANIP]: "Oracle Manipulation",
};

export type RequestPayload = {
  targetProtocol: string;
  targetChain: string;
  threatType: ThreatType;
  paymentTxHash?: string;
  evidence: {
    description: string;
    txHashes: string[];
    contractAddresses: string[];
    additionalData: string;
  };
  payoutAddress: string;
};

export type FlowType = "evm" | "http";
