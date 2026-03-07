import { RequestPayload } from "../types/payload.type";
import {
  EVMClient,
  hexToBase64,
  bytesToHex,
  bytesToBigint,
  LAST_FINALIZED_BLOCK_NUMBER,
  type Runtime,
} from "@chainlink/cre-sdk";
import {
  encodeFunctionData,
  decodeFunctionResult,
  parseAbiItem,
  type Hex,
  type Address,
} from "viem";
import type { Config } from "../types/config.type";

import type { VerificationResult } from "../types/results.type";
import { ThreatType } from "../enums/request.enum";

export function verifyOnChain(
  runtime: Runtime<Config>,
  submission: RequestPayload,
  chainSelector: bigint,
): VerificationResult {
  const evmClient = new EVMClient(chainSelector);
  let txsVerified = true;
  let onChainStateMatches = false;
  let patternMatchesThreat = false;
  let historicalPattern = false;
  const detailParts: string[] = [];

  // Step 1: Verify every claimed transaction exists -----
  for (const txHash of submission.evidence.txHashes) {
    try {
      const txResult = evmClient.getTransactionByHash(runtime, {
        hash: hexToBase64(txHash),
      });
      const tx = txResult.result();
      if (!tx.transaction) {
        txsVerified = false;
        detailParts.push(`TX_NOT_FOUND:${txHash}`);
      } else {
        detailParts.push(`TX_VERIFIED:${txHash}`);
      }
    } catch {
      txsVerified = false;
      detailParts.push(`TX_ERROR:${txHash}`);
    }
  }

  // Step 2: Threat-specific on-chain state checks -----
  const targetAddr = submission.targetProtocol;
  const targetAddrBase64 = hexToBase64(targetAddr);

  switch (submission.threatType) {
    case ThreatType.ADMIN_KEY: {
      try {
        const ownerCallData = encodeFunctionData({
          abi: [parseAbiItem("function owner() view returns (address)")],
          functionName: "owner",
        });
        const callResult = evmClient.callContract(runtime, {
          call: { to: targetAddr, data: ownerCallData },
          blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
        });
        const reply = callResult.result();
        if (reply.data) {
          const replyData =
            typeof reply.data === "string"
              ? reply.data
              : bytesToHex(reply.data);
          const currentOwner = decodeFunctionResult({
            abi: [parseAbiItem("function owner() view returns (address)")],
            functionName: "owner",
            data: replyData as Hex,
          }) as Address;
          detailParts.push(`CURRENT_OWNER:${currentOwner}`);
          onChainStateMatches = true;
        }
      } catch {
        detailParts.push("OWNER_CHECK_FAILED");
      }
      patternMatchesThreat = txsVerified && onChainStateMatches;
      break;
    }

    case ThreatType.RUG_PREP:
    case ThreatType.FUND_DRAIN: {
      try {
        const balResult = evmClient.balanceAt(runtime, {
          account: targetAddrBase64,
          blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
        });
        const bal = balResult.result();
        if (bal.balance) {
          const absValBytes = bal.balance.absVal;
          const balVal =
            absValBytes.length > 0 ? bytesToBigint(absValBytes) : 0n;
          detailParts.push(`BALANCE:${balVal.toString()}`);
          onChainStateMatches = true;
          if (balVal === 0n) patternMatchesThreat = true;
        }
      } catch {
        detailParts.push("BALANCE_CHECK_FAILED");
      }

      try {
        const transferTopic =
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
        const logResult = evmClient.filterLogs(runtime, {
          filterQuery: {
            addresses: [targetAddrBase64],
            fromBlock: LAST_FINALIZED_BLOCK_NUMBER,
            toBlock: LAST_FINALIZED_BLOCK_NUMBER,
            topics: [{ topic: [hexToBase64(transferTopic)] }],
          },
        });
        const logs = logResult.result();
        if (logs.logs && logs.logs.length > 0) {
          detailParts.push(`TRANSFER_EVENTS:${logs.logs.length}`);
          historicalPattern = true;
        }
      } catch {
        detailParts.push("LOG_CHECK_FAILED");
      }
      break;
    }

    case ThreatType.UPGRADE_VULN: {
      try {
        const implSlot =
          "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
        const storageCallData = encodeFunctionData({
          abi: [
            parseAbiItem(
              "function getStorageAt(address,bytes32) view returns (bytes32)",
            ),
          ],
          functionName: "getStorageAt",
          args: [targetAddr as Address, implSlot as Hex],
        });
        const callResult = evmClient.callContract(runtime, {
          call: { to: targetAddr, data: storageCallData },
          blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
        });
        const reply = callResult.result();
        if (reply.data) {
          detailParts.push("PROXY_IMPL_READABLE");
          onChainStateMatches = true;
        }
      } catch {
        detailParts.push("PROXY_CHECK_FAILED");
      }
      patternMatchesThreat = txsVerified;
      break;
    }

    case ThreatType.ORACLE_MANIP: {
      try {
        const latestRoundData = encodeFunctionData({
          abi: [
            parseAbiItem(
              "function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)",
            ),
          ],
          functionName: "latestRoundData",
        });
        const callResult = evmClient.callContract(runtime, {
          call: { to: targetAddr, data: latestRoundData },
          blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
        });
        const reply = callResult.result();
        if (reply.data) {
          detailParts.push("ORACLE_DATA_READABLE");
          onChainStateMatches = true;
          patternMatchesThreat = true;
        }
      } catch {
        detailParts.push("ORACLE_CHECK_FAILED");
      }
      break;
    }

    default:
      detailParts.push("UNKNOWN_THREAT_TYPE");
  }

  return {
    txsVerified,
    onChainStateMatches,
    patternMatchesThreat,
    aiConfirmsThreat: false, // Set later by AI analysis
    historicalPattern,
    details: detailParts.join("; "),
  };
}
