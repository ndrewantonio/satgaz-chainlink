import { usePublicClient, useWriteContract } from "wagmi";
import { keccak256, toHex, parseEventLogs } from "viem";
import type { RequestPayload } from "../types/payload";
import { ESCROW_ADDRESS, SUBMISSION_ESCROW_ABI } from "../lib/contracts";

export type PaymentResult = {
  txHash: `0x${string}`;
  paymentId: `0x${string}`;
  submitter: `0x${string}`;
  feePaid: bigint;
};

/**
 * Encodes the RequestPayload as UTF-8 bytes, computes paymentId = keccak256(bytes),
 * handles ERC-20 approval if needed, then calls SubmissionEscrow.pay().
 * Returns the parsed SubmissionPaid event data from the confirmed receipt.
 */
export function usePayment() {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const pay = async (payload: RequestPayload): Promise<PaymentResult> => {
    if (!publicClient)
      throw new Error("No public client — wallet not connected");

    // Encode payload as UTF-8 bytes → hex
    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
    const paymentId = keccak256(payloadBytes) as `0x${string}`;
    const payloadHex = toHex(payloadBytes);

    // Call SubmissionEscrow.pay(paymentId, payload)
    const payTxHash = await writeContractAsync({
      address: ESCROW_ADDRESS,
      abi: SUBMISSION_ESCROW_ABI,
      functionName: "pay",
      args: [paymentId, payloadHex],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: payTxHash,
    });

    // Parse SubmissionPaid event from receipt logs
    const logs = parseEventLogs({
      abi: SUBMISSION_ESCROW_ABI,
      eventName: "SubmissionPaid",
      logs: receipt.logs,
    });

    if (!logs[0]) throw new Error("SubmissionPaid event not found in receipt");

    return {
      txHash: payTxHash,
      paymentId: logs[0].args.paymentId,
      submitter: logs[0].args.submitter,
      feePaid: logs[0].args.feePaid,
    };
  };

  return { pay };
}
