import {
  handler,
  HTTPCapability,
  EVMClient,
  getNetwork,
  hexToBase64,
  Runner,
  type Runtime,
  type HTTPPayload,
} from "@chainlink/cre-sdk";
import { keccak256, toBytes } from "viem";
import { Config } from "./types/config.type";
import { onHttpSubmission } from "./handlers/http";
import { onEvmLogTrigger } from "./handlers/evm";

export const initWorkflow = (config: Config) => {
  const httpCapability = new HTTPCapability();

  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
  });
  if (!network) {
    throw new Error(`Unsupported chain: ${config.chainSelectorName}`);
  }

  const evmClient = new EVMClient(network.chainSelector.selector);

  const submissionPaidSig = keccak256(
    toBytes("SubmissionPaid(address,bytes32,uint256,uint256,bytes)"),
  );

  return [
    handler(
      httpCapability.trigger({}),
      (runtime: Runtime<Config>, trigger: HTTPPayload) =>
        onHttpSubmission(runtime, trigger, evmClient),
    ),
    handler(
      evmClient.logTrigger({
        addresses: [hexToBase64(config.submissionEscrowAddress)],
        topics: [{ values: [hexToBase64(submissionPaidSig)] }],
      }),
      onEvmLogTrigger,
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
