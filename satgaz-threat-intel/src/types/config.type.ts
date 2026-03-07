export type Config = {
  /** Chain selector name for the target chain (e.g. "ethereum-testnet-sepolia") */
  chainSelectorName: string;

  /** SubmissionEscrow contract address (hex, 0x-prefixed) */
  submissionEscrowAddress: string;

  /** ThreatOracle contract address (hex, 0x-prefixed) */
  threatOracleAddress: string;

  /** BountyVault contract address (hex, 0x-prefixed) */
  bountyVaultAddress: string;

  /** AI analysis endpoint URL */
  aiAnalysisUrl: string;

  /** DeFiLlama API base URL */
  defiLlamaBaseUrl: string;

  /** Minimum verification score to publish a threat (0-100) */
  minPublishScore: number;

  /** Maximum submissions to process per batch */
  maxBatchSize: number;
};
