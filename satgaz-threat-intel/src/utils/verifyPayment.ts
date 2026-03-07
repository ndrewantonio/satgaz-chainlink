import {
  EVMClient,
  hexToBase64,
  bytesToHex,
  type Runtime,
} from "@chainlink/cre-sdk";
import { keccak256, toBytes } from "viem";
import type { Config } from "../types/config.type";

/**
 * keccak256("SubmissionPaid(address,bytes32,uint256,uint256,bytes)")
 */
const SUBMISSION_PAID_SIG = keccak256(
  toBytes("SubmissionPaid(address,bytes32,uint256,uint256,bytes)"),
);

export type PaymentVerificationResult = {
  valid: boolean;
  submitter?: string;
  paymentId?: string;
  reason?: string;
};

/**
 * Verifies that the given transaction hash contains a SubmissionPaid event
 * emitted by the configured SubmissionEscrow contract.
 */
export function verifyPayment(
  runtime: Runtime<Config>,
  txHash: string,
  chainSelector: bigint,
  escrowAddress: string,
): PaymentVerificationResult {
  const evmClient = new EVMClient(chainSelector);

  try {
    const receiptResult = evmClient.getTransactionReceipt(runtime, {
      hash: hexToBase64(txHash),
    });
    const receipt = receiptResult.result();

    if (!receipt.receipt) {
      return { valid: false, reason: "Transaction receipt not found" };
    }

    if (receipt.receipt.status === 0n) {
      return { valid: false, reason: "Transaction reverted on-chain" };
    }

    for (const log of receipt.receipt.logs) {
      const logAddress = bytesToHex(log.address).toLowerCase();
      const topic0 = log.topics[0]
        ? bytesToHex(log.topics[0]).toLowerCase()
        : "";

      if (
        logAddress === escrowAddress.toLowerCase() &&
        topic0 === SUBMISSION_PAID_SIG.toLowerCase()
      ) {
        // topics[1] = submitter (address padded to 32 bytes — take last 20 bytes)
        const submitter = log.topics[1]
          ? `0x${bytesToHex(log.topics[1]).slice(-40)}`
          : "";
        // topics[2] = paymentId (bytes32)
        const paymentId = log.topics[2] ? bytesToHex(log.topics[2]) : "";
        return { valid: true, submitter, paymentId };
      }
    }

    return {
      valid: false,
      reason:
        "No SubmissionPaid event found from escrow contract in this transaction",
    };
  } catch {
    return { valid: false, reason: "Failed to fetch transaction receipt" };
  }
}
