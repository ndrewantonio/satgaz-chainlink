import { RequestPayload } from "../types/payload.type";
import {
  getNetwork,
  decodeJson,
  type Runtime,
  type HTTPPayload,
} from "@chainlink/cre-sdk";
import type { Config } from "../types/config.type";
import type { ThreatVerdict } from "../types/results.type";
import { validateSubmission } from "../utils/validateSubmission";
import { verifyPayment } from "../utils/verifyPayment";
import { runThreatAnalysis } from "../utils/runThreatAnalysis";

export const onHttpSubmission = (
  runtime: Runtime<Config>,
  triggerOutput: HTTPPayload,
): ThreatVerdict => {
  runtime.log("Received submission via HTTP trigger");

  // Input Validation
  let submission: RequestPayload;
  try {
    submission = decodeJson(triggerOutput.input) as RequestPayload;
  } catch {
    runtime.log("Failed to decode submission payload");
    throw new Error("Invalid submission payload");
  }

  // Validate submission structure and content
  const validationError = validateSubmission(submission);
  if (validationError) {
    runtime.log(`Validation failed: ${validationError}`);
    throw new Error(`Submission validation failed: ${validationError}`);
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
  const chainSelector = network.chainSelector.selector;

  // Payment gate — verify the payment tx emitted SubmissionPaid from the escrow
  if (!submission.paymentTxHash) {
    throw new Error("HTTP submissions must include paymentTxHash");
  }
  const paymentResult = verifyPayment(
    runtime,
    submission.paymentTxHash,
    chainSelector,
    runtime.config.submissionEscrowAddress,
  );
  if (!paymentResult.valid) {
    runtime.log(`Payment verification failed: ${paymentResult.reason}`);
    throw new Error(`Payment verification failed: ${paymentResult.reason}`);
  }
  runtime.log(
    `Payment verified — submitter=${paymentResult.submitter}, paymentId=${paymentResult.paymentId}`,
  );

  return runThreatAnalysis(runtime, submission, chainSelector);
};
