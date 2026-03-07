import {
  bytesToHex,
  getNetwork,
  type EVMLog,
  type Runtime,
} from "@chainlink/cre-sdk";
import { decodeAbiParameters, hexToString } from "viem";
import type { Config } from "../types/config.type";
import type { ThreatVerdict } from "../types/results.type";
import type { RequestPayload } from "../types/payload.type";
import { validateSubmission } from "../utils/validateSubmission";
import { runThreatAnalysis } from "../utils/runThreatAnalysis";

/**
 * EVM Log Trigger handler — fires automatically when SubmissionEscrow emits SubmissionPaid.
 */
export const onEvmLogTrigger = (
  runtime: Runtime<Config>,
  log: EVMLog,
): ThreatVerdict => {
  runtime.log(
    `SubmissionPaid event received from user ${log.address ? bytesToHex(log.address) : "unknown"}`,
  );

  // Decode non-indexed log data: (uint256 feePaid, uint256 timestamp, bytes payload)
  let submission: RequestPayload;
  try {
    const [feePaid, timestamp, payloadHex] = decodeAbiParameters(
      [
        { name: "feePaid", type: "uint256" },
        { name: "timestamp", type: "uint256" },
        { name: "payload", type: "bytes" },
      ],
      bytesToHex(log.data),
    );

    runtime.log(
      `Payment: feePaid=${(feePaid as bigint).toString()}, timestamp=${(timestamp as bigint).toString()}`,
    );

    const jsonString = hexToString(payloadHex as `0x${string}`);
    submission = JSON.parse(jsonString) as RequestPayload;
    delete (submission as Partial<RequestPayload>).paymentTxHash;
  } catch (err) {
    runtime.log(`Failed to decode submission payload from event log: ${err}`);
    throw new Error(
      "EVM trigger: unable to decode RequestPayload from SubmissionPaid event",
    );
  }

  // Validate decoded payload
  const validationError = validateSubmission(submission);
  if (validationError) {
    runtime.log(`Payload validation failed: ${validationError}`);
    throw new Error(`EVM trigger payload invalid: ${validationError}`);
  }

  runtime.log(
    `Processing ${submission.threatType} threat against ${submission.targetProtocol}`,
  );

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: submission.targetChain,
  });
  if (!network) {
    throw new Error(`Unsupported chain: ${submission.targetChain}`);
  }

  return runThreatAnalysis(runtime, submission, network.chainSelector.selector);
};
