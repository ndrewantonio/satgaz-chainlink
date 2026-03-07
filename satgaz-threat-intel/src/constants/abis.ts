import { parseAbiItem } from "viem";

export const SUBMISSION_ESCROW_ABI = [
  parseAbiItem("function pay(bytes32 paymentId, bytes payload)"),
  parseAbiItem("function submissionFee() view returns (uint256)"),
  parseAbiItem(
    "event SubmissionPaid(address indexed submitter, bytes32 indexed paymentId, uint256 feePaid, uint256 timestamp, bytes payload)",
  ),
] as const;

export const THREAT_ORACLE_ABI = [
  parseAbiItem(
    "function publishThreat(address protocol, uint8 threatType, uint8 threatLevel, uint8 confidence, uint256 timestamp)",
  ),
  parseAbiItem(
    "function getLatestThreat(address protocol) view returns (uint8 threatType, uint8 threatLevel, uint8 confidence, uint256 timestamp)",
  ),
] as const;

export const BOUNTY_VAULT_ABI = [
  parseAbiItem("function payBounty(address recipient, uint256 amount)"),
  parseAbiItem("function getVaultBalance() view returns (uint256)"),
] as const;
