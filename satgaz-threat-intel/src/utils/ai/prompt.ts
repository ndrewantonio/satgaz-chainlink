import { VerificationResult } from "../../types/results.type";
import { RequestPayload } from "../../types/payload.type";

export function buildAiPrompt(
  submission: RequestPayload,
  verification: VerificationResult,
  tvlChange: number,
): string {
  return `You are a DeFi security analyst. Analyze the following threat intelligence and provide a structured assessment.

THREAT REPORT:
- Target Protocol: ${submission.targetProtocol}
- Threat Type: ${submission.threatType}
- Evidence Description: ${submission.evidence.description}
- Transaction Hashes: ${submission.evidence.txHashes.join(", ")}
- Contracts Involved: ${submission.evidence.contractAddresses.join(", ")}
- Additional Context: ${submission.evidence.additionalData}

ON-CHAIN VERIFICATION RESULTS:
- Transactions Verified: ${verification.txsVerified}
- On-Chain State Matches Claim: ${verification.onChainStateMatches}
- Pattern Matches Threat Type: ${verification.patternMatchesThreat}
- Historical Pattern Detected: ${verification.historicalPattern}
- Verification Details: ${verification.details}

ENRICHMENT DATA:
- TVL Change (30d): ${tvlChange.toFixed(2)}%

Respond ONLY with a JSON object (no markdown, no explanation):
{
  "threatConfirmed": true/false,
  "riskLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "reasoning": "Brief explanation (max 200 chars)"
}`;
}
