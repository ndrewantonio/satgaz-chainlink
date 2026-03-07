import { encodeFunctionData } from "viem";
import type { Hex, Address } from "viem";
import { THREAT_ORACLE_ABI, BOUNTY_VAULT_ABI } from "../constants/abis";
import {
  THREAT_TYPE_ENUM,
  THREAT_LEVEL_ENUM,
  CONFIDENCE_ENUM,
} from "../constants/encodings";
import { ThreatVerdict } from "../types/results.type";

export function encodePublishThreat(verdict: ThreatVerdict): Hex {
  return encodeFunctionData({
    abi: THREAT_ORACLE_ABI,
    functionName: "publishThreat",
    args: [
      verdict.targetProtocol as Address,
      THREAT_TYPE_ENUM[verdict.threatType as keyof typeof THREAT_TYPE_ENUM],
      THREAT_LEVEL_ENUM[verdict.threatLevel as keyof typeof THREAT_LEVEL_ENUM],
      CONFIDENCE_ENUM[verdict.confidence as keyof typeof CONFIDENCE_ENUM],
      BigInt(verdict.timestamp),
    ],
  });
}

export function encodePayBounty(verdict: ThreatVerdict): Hex {
  return encodeFunctionData({
    abi: BOUNTY_VAULT_ABI,
    functionName: "payBounty",
    args: [verdict.payoutAddress as Address, BigInt(verdict.bountyAmount)],
  });
}
