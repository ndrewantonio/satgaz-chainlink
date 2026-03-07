// Types
export type { Config } from "./types/config.type";
export type { RequestPayload } from "./types/payload.type";
export type { RequestPayload as WhistleblowerSubmission } from "./types/payload.type";
export type { VerificationResult, ThreatVerdict } from "./types/results.type";

// Enums
export { ThreatType, ThreatLevel } from "./enums/request.enum";
export { ConfidenceLevel, VerdictOutcome } from "./enums/outcome.enum";

// Utils
export { validateSubmission } from "./utils/validateSubmission";
export { verifyOnChain } from "./utils/verifyOnChain";
export { fetchProtocolEnrichment } from "./utils/fetchProtocolEnrichment";
export { buildAiPrompt } from "./utils/ai/prompt";
export { parseAiResponse } from "./utils/ai/response";
export {
  computeVerificationScore,
  determineOutcome,
  determineConfidence,
  determineThreatLevel,
} from "./utils/verdict/scoring";
export { buildVerdict } from "./utils/verdict/buildVerdict";
export {
  encodePublishThreat,
  encodePayBounty,
} from "./utils/encodePublishThreat";
export { runThreatAnalysis } from "./utils/runThreatAnalysis";

// Handlers
export { onHttpSubmission } from "./handlers/http";
export { onEvmLogTrigger } from "./handlers/evm";

// Workflow
export { initWorkflow } from "./main";
