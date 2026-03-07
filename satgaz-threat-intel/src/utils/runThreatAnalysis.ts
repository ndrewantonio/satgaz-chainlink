import {
  HTTPClient,
  ConfidentialHTTPClient,
  EVMClient,
  consensusIdenticalAggregation,
  prepareReportRequest,
  ok,
  text,
  getNetwork,
  hexToBase64,
  type Runtime,
  type HTTPSendRequester,
} from "@chainlink/cre-sdk";
import type { Config } from "../types/config.type";
import type { RequestPayload } from "../types/payload.type";
import type { VerificationResult, ThreatVerdict } from "../types/results.type";
import { ThreatLevel } from "../enums/request.enum";
import { VerdictOutcome } from "../enums/outcome.enum";
import { verifyOnChain } from "./verifyOnChain";
import { fetchProtocolEnrichment } from "./fetchProtocolEnrichment";
import { buildAiPrompt } from "./ai/prompt";
import { parseAiResponse } from "./ai/response";
import { buildVerdict } from "./verdict/buildVerdict";
import { encodePayBounty, encodePublishThreat } from "./encodePublishThreat";

/**
 * Core threat intelligence analysis pipeline.
 * Shared by both the HTTP trigger handler and the EVM Log Trigger handler.
 */
export function runThreatAnalysis(
  runtime: Runtime<Config>,
  submission: RequestPayload,
  chainSelector: bigint,
): ThreatVerdict {
  // Phase 1 - On-chain verification
  const verification = verifyOnChain(runtime, submission, chainSelector);
  runtime.log(`On-chain verification: ${verification.details}`);

  // Phase 2 - Public API enrichment (DeFiLlama TVL)
  const httpClient = new HTTPClient();
  const enrichFn = httpClient.sendRequest(
    runtime,
    (requester: HTTPSendRequester, baseUrl: string, targetProtocol: string) =>
      fetchProtocolEnrichment(requester, baseUrl, targetProtocol),
    consensusIdenticalAggregation(),
  );
  const enrichment = enrichFn(
    runtime.config.defiLlamaBaseUrl,
    submission.targetProtocol,
  ).result();
  runtime.log(
    `TVL enrichment: change=${enrichment.tvlChange.toFixed(2)}%, hasData=${enrichment.hasData}`,
  );

  // Phase 3 - AI-assisted analysis via Confidential HTTP
  const aiPrompt = buildAiPrompt(
    submission,
    verification,
    enrichment.tvlChange,
  );
  const confidentialHttp = new ConfidentialHTTPClient();

  let aiResult = {
    threatConfirmed: false,
    riskLevel: ThreatLevel.LOW,
    reasoning: "AI analysis not performed",
  };

  try {
    const aiResponse = confidentialHttp
      .sendRequest(runtime, {
        vaultDonSecrets: [{ key: "AI_API_KEY", namespace: "satgaz" }],
        request: {
          url: runtime.config.aiAnalysisUrl,
          method: "POST",
          bodyString: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: aiPrompt }],
            temperature: 0,
            max_tokens: 300,
          }),
          multiHeaders: {
            "Content-Type": { values: ["application/json"] },
            Authorization: { values: ["Bearer {{secrets.AI_API_KEY}}"] },
          },
          timeout: "30000",
        },
      })
      .result();

    if (ok(aiResponse)) {
      const aiBody = text(aiResponse);
      try {
        const openaiResp = JSON.parse(aiBody);
        const content = openaiResp?.choices?.[0]?.message?.content || aiBody;
        aiResult = parseAiResponse(content);
        runtime.log(
          `AI analysis: confirmed=${aiResult.threatConfirmed}, risk=${aiResult.riskLevel}`,
        );
      } catch {
        runtime.log("AI response parse failed, using on-chain data only");
      }
    } else {
      runtime.log(`AI API returned status ${aiResponse.statusCode}`);
    }
  } catch {
    runtime.log(
      "Confidential HTTP to AI failed, continuing without AI enrichment",
    );
  }

  // Phase 4 - Deterministic scoring
  const mergedVerification: VerificationResult = {
    ...verification,
    aiConfirmsThreat: aiResult.threatConfirmed,
  };

  const verdict = buildVerdict(
    submission,
    mergedVerification,
    aiResult,
    enrichment.tvlChange,
    runtime.now().getTime(),
  );

  runtime.log(
    `Verdict — outcome=${verdict.outcome}, score=${verdict.score}, ` +
      `level=${verdict.threatLevel}, confidence=${verdict.confidence}`,
  );

  // Phase 5 - Publish & pay out (only for VALID + above threshold)
  if (
    verdict.outcome === VerdictOutcome.VALID &&
    verdict.score >= runtime.config.minPublishScore
  ) {
    runtime.log("Publishing threat alert and processing bounty payout");

    const publishCalldata = encodePublishThreat(verdict);
    const reportPayload = prepareReportRequest(publishCalldata);
    const signedReport = runtime.report(reportPayload).result();

    const publishChainNetwork = getNetwork({
      chainFamily: "evm",
      chainSelectorName: runtime.config.chainSelectorName,
    });
    if (publishChainNetwork) {
      const publishEvm = new EVMClient(
        publishChainNetwork.chainSelector.selector,
      );
      const writeResult = publishEvm
        .writeReport(runtime, {
          receiver: hexToBase64(runtime.config.threatOracleAddress),
          report: signedReport,
        })
        .result();
      runtime.log(`ThreatOracle write status: ${writeResult.txStatus}`);
    }

    if (verdict.bountyAmount > 0) {
      const bountyCalldata = encodePayBounty(verdict);
      const bountyReport = prepareReportRequest(bountyCalldata);
      const signedBountyReport = runtime.report(bountyReport).result();

      const bountyChainNetwork = getNetwork({
        chainFamily: "evm",
        chainSelectorName: runtime.config.chainSelectorName,
      });
      if (bountyChainNetwork) {
        const bountyEvm = new EVMClient(
          bountyChainNetwork.chainSelector.selector,
        );
        const bountyWriteResult = bountyEvm
          .writeReport(runtime, {
            receiver: hexToBase64(runtime.config.bountyVaultAddress),
            report: signedBountyReport,
          })
          .result();
        runtime.log(`BountyVault write status: ${bountyWriteResult.txStatus}`);
      }
    }
  } else {
    runtime.log(
      `Verdict does not meet publish threshold (score=${verdict.score}, ` +
        `required=${runtime.config.minPublishScore}). No on-chain action.`,
    );
  }

  runtime.log("Processing complete. Raw evidence discarded.");
  return verdict;
}
