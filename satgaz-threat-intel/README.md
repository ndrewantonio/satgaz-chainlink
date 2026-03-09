# satgaz-threat-intel

> **This package is a [Chainlink CRE](https://docs.chain.link/) workflow.** It is the intelligence core of SatGaz — a fully autonomous threat analysis pipeline that runs inside the Chainlink Compute Runtime Environment with no centralized backend.

When a user pays `SubmissionEscrow.pay()` on-chain, the CRE EVM Log Trigger fires this workflow automatically. The workflow validates the submission, enriches it with live on-chain and off-chain data, runs AI-assisted analysis via a DON-managed secret, scores the result deterministically, and — if the threat is confirmed — writes a signed verdict to `ThreatOracle` and pays the bounty from `BountyVault`, all atomically, all on-chain.

---

## Chainlink CRE Integration

This is the package that makes SatGaz trustless. Every CRE capability used is highlighted below.

### Triggers

| Trigger             | Config                                        | Purpose                                                                                                                                                                                               |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EVM Log Trigger** | `evmClient.logTrigger({ addresses, topics })` | Fires on every `SubmissionPaid(address,bytes32,uint256,uint256,bytes)` event from `SubmissionEscrow`. The full payload is decoded directly from the ABI-encoded log data — no extra HTTP call needed. |
| **HTTP Trigger**    | `httpCapability.trigger({})`                  | Accepts direct `POST` submissions with a `paymentTxHash`. The workflow reads the escrow contract on-chain to verify the payment before processing.                                                    |

### Capabilities

| Capability                                        | How It's Used                                                                                                                                                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`HTTPClient`**                                  | Fetches live protocol TVL from DeFiLlama. Wrapped in `consensusIdenticalAggregation()` — multiple CRE nodes must return identical data before the result is accepted.                                                |
| **`ConfidentialHTTPClient`**                      | Calls the OpenAI API (`gpt-4o-mini`) for AI-assisted threat analysis. The `AI_API_KEY` is stored in the DON secrets vault and injected via `vaultDonSecrets` — it is **never visible to operators or node runners**. |
| **`EVMClient.writeReport()`**                     | Writes signed verdicts atomically to `ThreatOracle.publishThreat()` and `BountyVault.payBounty()` on Base Sepolia.                                                                                                   |
| **`runtime.report()` + `prepareReportRequest()`** | Produces a cryptographically signed report payload that the CRE runtime delivers to the target contracts.                                                                                                            |
| **`consensusIdenticalAggregation()`**             | Enforces that all nodes agree on the DeFiLlama TVL response before it is used in scoring.                                                                                                                            |

### Secrets

```yaml
# secrets.yaml (project root)
satgaz:
  AI_API_KEY: "sk-..." # OpenAI key — injected by DON, never logged
```

---

## Analysis Pipeline

Each submission passes through five sequential phases:

```
Trigger (EVM Log or HTTP)
        │
        ▼
① Validate submission
   validateSubmission()
   — checks required fields, threat type, chain name, evidence

② Verify on-chain
   verifyOnChain()
   — EVMClient reads tx receipts, contract state, and historical patterns
   — produces VerificationResult { txsVerified, onChainStateMatches,
                                   patternMatchesThreat, historicalPattern }

③ Enrich TVL
   HTTPClient + consensusIdenticalAggregation()
   → fetchProtocolEnrichment(defiLlamaBaseUrl, targetProtocol)
   — fetches 24h TVL change; sharp drops corroborate the threat

④ AI-assisted analysis
   ConfidentialHTTPClient (DON secret: AI_API_KEY)
   → buildAiPrompt(submission, verification, tvlChange)
   → GPT-4o-mini → parseAiResponse()
   — produces { threatConfirmed, riskLevel, reasoning }

⑤ Score & build verdict
   computeVerificationScore() → determineOutcome() / determineConfidence()
   buildVerdict()
   — produces ThreatVerdict { outcome, score, threatLevel, confidence,
                               bountyAmount, ... }

⑥ Publish (only if outcome == VALID and score ≥ minPublishScore)
   encodePublishThreat() → prepareReportRequest() → runtime.report()
   → EVMClient.writeReport() → ThreatOracle.publishThreat()

   encodePayBounty()     → prepareReportRequest() → runtime.report()
   → EVMClient.writeReport() → BountyVault.payBounty()
```

---

## Project Structure

```
satgaz-threat-intel/
├── src/
│   ├── main.ts                    # CRE workflow entry point — registers triggers
│   ├── index.ts                   # Public exports
│   ├── handlers/
│   │   ├── evm.ts                 # EVM Log Trigger handler
│   │   └── http.ts                # HTTP Trigger handler
│   ├── utils/
│   │   ├── runThreatAnalysis.ts   # Core pipeline (phases 1-6)
│   │   ├── validateSubmission.ts  # Input validation
│   │   ├── verifyOnChain.ts       # On-chain state checks
│   │   ├── fetchProtocolEnrichment.ts  # DeFiLlama TVL fetch
│   │   ├── verifyPayment.ts       # HTTP flow payment receipt check
│   │   ├── encodePublishThreat.ts # ABI-encode oracle + bounty calldata
│   │   ├── ai/
│   │   │   ├── prompt.ts          # Builds the GPT prompt
│   │   │   └── response.ts        # Parses the GPT response
│   │   └── verdict/
│   │       ├── scoring.ts         # Deterministic score computation
│   │       └── buildVerdict.ts    # Assembles the final ThreatVerdict
│   ├── types/
│   │   ├── config.type.ts         # Config JSON shape
│   │   ├── payload.type.ts        # RequestPayload (user submission)
│   │   └── results.type.ts        # VerificationResult, ThreatVerdict
│   ├── enums/
│   │   ├── request.enum.ts        # ThreatType, ThreatLevel
│   │   └── outcome.enum.ts        # ConfidenceLevel, VerdictOutcome
│   └── constants/
│       ├── abis.ts                # Contract ABIs for on-chain reads
│       └── encodings.ts           # ABI encoding helpers
├── config.staging.json            # Staging contract addresses + thresholds
├── config.production.json         # Production contract addresses + thresholds
├── workflow.yaml                  # CRE workflow settings (name, paths, secrets)
└── main.test.ts                   # Local simulation tests
```

---

## Configuration

### `config.staging.json` / `config.production.json`

```jsonc
{
  "chainSelectorName": "ethereum-testnet-sepolia-base-1", // chain for SubmissionEscrow + ThreatOracle
  "submissionEscrowAddress": "0xf217CE89D15455e68276718e499eC87bF9b5b207",
  "threatOracleAddress": "0x...",
  "bountyVaultAddress": "0x...",
  "aiAnalysisUrl": "https://api.openai.com/v1/chat/completions",
  "defiLlamaBaseUrl": "https://api.llama.fi",
  "minPublishScore": 60, // minimum score for on-chain publishing (0–100)
  "maxBatchSize": 10,
}
```

### `workflow.yaml`

```yaml
staging-settings:
  user-workflow:
    workflow-name: "satgaz-threat-intel-staging"
  workflow-artifacts:
    workflow-path: "./src/main.ts"
    config-path: "./config.staging.json"
    secrets-path: "../secrets.yaml"
```

### `secrets.yaml` (project root)

```yaml
satgaz:
  AI_API_KEY: "sk-your-openai-key" # injected as DON secret — never logged
```

The `CRE_ETH_PRIVATE_KEY` is also required in your environment for on-chain simulation:

```bash
export CRE_ETH_PRIVATE_KEY=0x...
```

---

## Prerequisites

- [Bun](https://bun.sh/) or Node.js 20+
- [Chainlink CRE CLI](https://docs.chain.link/chainlink-automation) (`cre`)
- Deployed `SubmissionEscrow`, `ThreatOracle`, and `BountyVault` contracts (see [satgaz-contracts](../satgaz-contracts/README.md))

---

## Installation

```bash
cd satgaz-threat-intel
bun install
```

---

## Local Simulation

### HTTP Trigger

```bash
export PAYLOAD='{"targetProtocol":"Uniswap","targetChain":"ethereum-testnet-sepolia","threatType":"RUG_PREP","evidence":{"description":"Large unusual transfer","txHashes":["0xabc..."],"contractAddresses":["0xdef..."],"additionalData":""},"payoutAddress":"0xYourAddress","paymentTxHash":"0xtxhash..."}'

cre workflow simulate satgaz-threat-intel \
  --target=staging-settings \
  --non-interactive \
  --trigger-index 1 \
  --http-payload "$PAYLOAD"
```

### EVM Log Trigger

```bash
cre workflow simulate satgaz-threat-intel \
  --target=staging-settings \
  --non-interactive \
  --trigger-index 0
```

The EVM trigger replays a real `SubmissionPaid` event from the configured `submissionEscrowAddress`.

---

## Trigger Index Reference

| Index | Trigger         | Description                                        |
| ----- | --------------- | -------------------------------------------------- |
| `0`   | EVM Log Trigger | Listens for `SubmissionPaid` on `SubmissionEscrow` |
| `1`   | HTTP Trigger    | Accepts `POST` payload + `paymentTxHash`           |

---

## Threat Types & Verdict Outcomes

| `ThreatType`   | Description                     |
| -------------- | ------------------------------- |
| `RUG_PREP`     | Pre-rug liquidity manipulation  |
| `ADMIN_KEY`    | Suspicious admin key activity   |
| `FUND_DRAIN`   | Active or imminent fund drain   |
| `UPGRADE_VULN` | Malicious or vulnerable upgrade |
| `ORACLE_MANIP` | Oracle price manipulation       |

| `VerdictOutcome` | Meaning                                                      |
| ---------------- | ------------------------------------------------------------ |
| `VALID`          | Threat confirmed; on-chain action taken if score ≥ threshold |
| `INCONCLUSIVE`   | Insufficient evidence                                        |
| `INVALID`        | Submission does not describe a real threat                   |

Steps to run the example

## 1. Update .env file

You need to add a private key to env file. This is specifically required if you want to simulate chain writes. For that to work the key should be valid and funded.
If your workflow does not do any chain write then you can just put any dummy key as a private key. e.g.

```
CRE_ETH_PRIVATE_KEY=0000000000000000000000000000000000000000000000000000000000000001
```

## 2. Install dependencies

```bash
bun install
```

## 3. Simulate the workflow

Run the command from <b>project root directory</b>

```bash
cre workflow simulate <path-to-workflow> --target=staging-settings
```

It is recommended to look into other existing examples to see how to write a workflow. You can generate them by running the `cre init` command.
