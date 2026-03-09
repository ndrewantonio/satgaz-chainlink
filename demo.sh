#!/usr/bin/env bash
# =============================================================================
#  satgaz — CRE Workflow Demo Script
#  Demonstrates both trigger paths and explains each step of the pipeline.
# =============================================================================
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[1;35m'
BLUE='\033[1;34m'
RED='\033[1;31m'
RESET='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Helpers ───────────────────────────────────────────────────────────────────
header()  { echo -e "\n${CYAN}${BOLD}╔══ $1 ══${RESET}"; }
step()    { echo -e "\n${YELLOW}${BOLD}  ➤  $1${RESET}"; }
info()    { echo -e "  ${DIM}$1${RESET}"; }
success() { echo -e "  ${GREEN}✓  $1${RESET}"; }
warning() { echo -e "  ${YELLOW}⚠  $1${RESET}"; }
sep()     { echo -e "${DIM}  ─────────────────────────────────────────────────────────${RESET}"; }
pause()   { echo -e "\n  ${MAGENTA}${BOLD}[ Press ENTER to continue ]${RESET}"; read -r; }

# ── Env setup ─────────────────────────────────────────────────────────────────
if [[ -z "${PRIVATE_KEY:-}" ]]; then
  PRIVATE_KEY=$(grep '^PRIVATE_KEY=' "$SCRIPT_DIR/satgaz-contracts/.env" 2>/dev/null | cut -d= -f2 || true)
fi
if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo -e "${RED}ERROR: PRIVATE_KEY not found. Add it to satgaz-contracts/.env${RESET}"
  exit 1
fi

AI_API_KEY="${AI_API_KEY:-dummy-key-for-sim}"
ESCROW="0xf217CE89D15455e68276718e499eC87bF9b5b207"
RPC="https://base-sepolia-rpc.publicnode.com"

# =============================================================================
#  INTRO
# =============================================================================
clear
echo -e "${CYAN}${BOLD}"
cat << 'BANNER'
 ███████╗ █████╗ ████████╗ ██████╗  █████╗ ███████╗
 ██╔════╝██╔══██╗╚══██╔══╝██╔════╝ ██╔══██╗╚══███╔╝
 ███████╗███████║   ██║   ██║  ███╗███████║  ███╔╝
 ╚════██║██╔══██║   ██║   ██║   ██║██╔══██║ ███╔╝
 ███████║██║  ██║   ██║   ╚██████╔╝██║  ██║███████╗
 ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝
 Decentralised Threat Intelligence Protocol on Chainlink CRE
BANNER
echo -e "${RESET}"

echo -e "  ${BOLD}What is satgaz?${RESET}"
echo -e "  A decentralised whistleblower protocol. Community members detect"
echo -e "  on-chain DeFi threats (rug pulls, fund drains, oracle exploits),"
echo -e "  submit evidence, and earn bounties — all verified trustlessly on-chain"
echo -e "  by the Chainlink Compute Runtime Environment (CRE)."
echo
echo -e "  ${BOLD}Contract${RESET}: SubmissionEscrow @ ${CYAN}$ESCROW${RESET}"
echo -e "  ${BOLD}Chain${RESET}   : Base Sepolia (testnet)"
echo -e "  ${BOLD}Workflow${RESET}: satgaz-threat-intel (Chainlink CRE)"

pause

# =============================================================================
#  PART 1 — THE SPAM GATE: WHY USERS MUST PAY
# =============================================================================
header "PART 1 — THE SPAM GATE  (Why pay first?)"

echo
echo -e "  ${BOLD}Problem:${RESET} Without a cost-of-entry, anyone can flood the workflow"
echo -e "  with fake threat reports. This would:"
echo -e "    • waste DON compute on fabricated submissions"
echo -e "    • dilute real threat signals with noise"
echo -e "    • drain the bounty pool through false positives"
echo
echo -e "  ${BOLD}Solution: SubmissionEscrow contract${RESET}"
echo -e "  Before any submission reaches the CRE workflow, the whistleblower"
echo -e "  must call ${CYAN}pay(paymentId, payload)${RESET} on the escrow contract."
sep
echo -e "  ${BOLD}How it works:${RESET}"
echo
echo -e "  ${BLUE}User${RESET}                     ${BLUE}SubmissionEscrow${RESET}              ${BLUE}Chainlink CRE${RESET}"
echo -e "  │                        │                             │"
echo -e "  │  pay(paymentId,        │                             │"
echo -e "  │      payload)  ───────►│ emit SubmissionPaid(        │"
echo -e "  │                        │   submitter,                │"
echo -e "  │                        │   paymentId,  ─────────────►│ EVM Log Trigger fires"
echo -e "  │                        │   feePaid,                  │ → decode payload"
echo -e "  │                        │   timestamp,                │ → run analysis"
echo -e "  │                        │   payload )                 │"
sep
echo -e "  ${DIM}paymentId = keccak256(payload bytes)${RESET}"
echo -e "  ${DIM}This cryptographically binds the fee to the exact submission content.${RESET}"
echo -e "  ${DIM}Any tampering invalidates the payment ID.${RESET}"

pause

# =============================================================================
#  PART 2 — THE TWO TRIGGER PATHS
# =============================================================================
header "PART 2 — TWO TRIGGER PATHS  (Same pipeline, different entry)"

echo
echo -e "  Both paths run ${BOLD}identical analysis${RESET} — only the entry point differs."
echo
echo -e "  ${GREEN}${BOLD}PATH A — EVM Log Trigger (automated, production)${RESET}"
echo -e "  ┌─────────────────────────────────────────────────────────────────┐"
echo -e "  │ User calls pay() → SubmissionPaid event → CRE auto-triggers     │"
echo -e "  │                                                                 │"
echo -e "  │  • No separate HTTP call needed after paying                    │"
echo -e "  │  • CRE DON decodes the payload directly from the event log      │"
echo -e "  │  • Fully automated — fire and forget                            │"
echo -e "  │  • paymentTxHash field in payload is ignored (already paid)     │"
echo -e "  └─────────────────────────────────────────────────────────────────┘"
echo
echo -e "  ${BLUE}${BOLD}PATH B — HTTP Trigger (manual, useful for testing)${RESET}"
echo -e "  ┌─────────────────────────────────────────────────────────────────┐"
echo -e "  │ User pays → then POSTs payload + paymentTxHash to HTTP endpoint │"
echo -e "  │                                                                 │"
echo -e "  │  • Workflow fetches the tx receipt and checks it on-chain       │"
echo -e "  │  • Verifies SubmissionPaid was emitted by the correct contract  │"
echo -e "  │  • Rejects if tx reverted, wrong contract, or missing event     │"
echo -e "  │  • Useful when the EVM trigger is not yet live                 │"
echo -e "  └─────────────────────────────────────────────────────────────────┘"

pause

# =============================================================================
#  PART 3 — THE ANALYSIS PIPELINE (5-PHASE BREAKDOWN)
# =============================================================================
header "PART 3 — THE 5-PHASE ANALYSIS PIPELINE"

echo
echo -e "  After a valid payment is confirmed, the same pipeline runs:"
echo
echo -e "  ${YELLOW}${BOLD}PHASE 1 — On-Chain Verification${RESET}  (+30 pts tx verified, +30 pts state match)"
echo -e "  ${DIM}  The CRE node reads directly from the target blockchain using EVM calls.${RESET}"
echo -e "  ${DIM}  • Fetches each evidence txHash and confirms it exists on-chain${RESET}"
echo -e "  ${DIM}  • Reads contract state (owner, balances, admin slots) from the target protocol${RESET}"
echo -e "  ${DIM}  • Checks whether the observed state matches the claimed threat type${RESET}"
echo -e "  ${DIM}  • Pattern matching: e.g. large balance drain → RUG_PREP pattern check${RESET}"
echo
echo -e "  ${YELLOW}${BOLD}PHASE 2 — TVL Enrichment via DeFiLlama${RESET}  (+5 / -5 pts)"
echo -e "  ${DIM}  Public HTTP call to DeFiLlama for 30-day TVL history.${RESET}"
echo -e "  ${DIM}  • TVL dropped >50% in 30 days → +5 bonus (supports rug claim)${RESET}"
echo -e "  ${DIM}  • TVL grew >100% in 30 days   → -5 penalty (healthy looking protocol)${RESET}"
echo -e "  ${DIM}  • No DeFiLlama data available  → neutral, pipeline continues${RESET}"
echo
echo -e "  ${YELLOW}${BOLD}PHASE 3 — AI-Assisted Analysis via Confidential HTTP${RESET}  (+10 pts)"
echo -e "  ${DIM}  OpenAI is queried through Chainlink Confidential HTTP.${RESET}"
echo -e "  ${DIM}  • The AI_API_KEY lives inside the DON vault — never exposed${RESET}"
echo -e "  ${DIM}  • A structured prompt is built from evidence + on-chain results${RESET}"
echo -e "  ${DIM}  • AI returns: threatConfirmed (bool), riskLevel, reasoning${RESET}"
echo -e "  ${DIM}  • AI failure is non-fatal — pipeline continues with 0 AI points${RESET}"
echo
echo -e "  ${YELLOW}${BOLD}PHASE 4 — Deterministic Scoring Engine${RESET}  (0–100 scale)"
echo -e "  ${DIM}  All signals combined into a reproducible score:${RESET}"
echo -e "  ${DIM}  ┌─────────────────────────────────────────────────┬────────┐${RESET}"
echo -e "  ${DIM}  │ All claimed transactions verified on-chain       │ +30 pt │${RESET}"
echo -e "  ${DIM}  │ On-chain state matches the threat claim          │ +30 pt │${RESET}"
echo -e "  ${DIM}  │ Pattern matches threat type                      │ +20 pt │${RESET}"
echo -e "  ${DIM}  │ AI confirms threat                               │ +10 pt │${RESET}"
echo -e "  ${DIM}  │ Historical pattern detected                      │ +10 pt │${RESET}"
echo -e "  ${DIM}  │ TVL dropped >50% (bonus)                         │  +5 pt │${RESET}"
echo -e "  ${DIM}  │ TVL grew >100%  (penalty)                        │  -5 pt │${RESET}"
echo -e "  ${DIM}  ├─────────────────────────────────────────────────┼────────┤${RESET}"
echo -e "  ${DIM}  │  80–100 → VALID    HIGH confidence              │        │${RESET}"
echo -e "  ${DIM}  │  60–79  → VALID    MEDIUM confidence            │        │${RESET}"
echo -e "  ${DIM}  │  40–59  → INCONCLUSIVE                          │        │${RESET}"
echo -e "  ${DIM}  │  0–39   → INVALID                               │        │${RESET}"
echo -e "  ${DIM}  └─────────────────────────────────────────────────┴────────┘${RESET}"
echo
echo -e "  ${YELLOW}${BOLD}PHASE 5 — On-Chain Publishing & Bounty Payout${RESET}  (VALID only)"
echo -e "  ${DIM}  If score ≥ minPublishScore (currently 60):${RESET}"
echo -e "  ${DIM}  • Encodes verdict and writes it to ThreatOracle contract${RESET}"
echo -e "  ${DIM}  • Calls BountyVault to disburse USDC to payoutAddress${RESET}"
echo -e "  ${DIM}  ┌──────────────┬──────────────┐${RESET}"
echo -e "  ${DIM}  │ CRITICAL      │  500 USDC    │${RESET}"
echo -e "  ${DIM}  │ HIGH          │  250 USDC    │${RESET}"
echo -e "  ${DIM}  │ MEDIUM        │  100 USDC    │${RESET}"
echo -e "  ${DIM}  └──────────────┴──────────────┘${RESET}"

pause

# =============================================================================
#  PART 4 — LIVE DEMO: PATH A  (EVM Log Trigger)
# =============================================================================
header "PART 4 — LIVE DEMO: PATH A  (EVM Log Trigger)"

echo
echo -e "  ${BOLD}Step 1 — Build the test payload${RESET}"
info "This is a simulated RUG_PREP threat report. The payload is ABI-encoded"
info "into the SubmissionPaid event so CRE can decode it without an extra HTTP call."
echo

PAYLOAD_A='{"targetProtocol":"0x1111111111111111111111111111111111111111","targetChain":"ethereum-testnet-sepolia","threatType":"RUG_PREP","paymentTxHash":"0x0000000000000000000000000000000000000000000000000000000000000000","evidence":{"description":"Admin moved 80% of treasury to a fresh wallet within the last 24 hours","txHashes":["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],"contractAddresses":["0x2222222222222222222222222222222222222222"],"additionalData":"Team members spotted selling tokens on secondary markets"},"payoutAddress":"0x9999999999999999999999999999999999999999"}'

echo -e "${DIM}  $PAYLOAD_A${RESET}" | fold -s -w 80

echo
step "Step 2 — Compute paymentId = keccak256(payload bytes)"
info "Binding the fee to the exact payload content — any change invalidates the ID."

PAYLOAD_HEX_A="0x$(printf '%s' "$PAYLOAD_A" | xxd -p | tr -d '\n')"
PAYMENT_ID_A=$(cast keccak "$PAYLOAD_HEX_A")
success "paymentId: $PAYMENT_ID_A"

pause

step "Step 3 — Call SubmissionEscrow.pay() on Base Sepolia"
info "This emits SubmissionPaid. In production, the CRE EVM Log Trigger"
info "would pick it up automatically. Here we capture the tx hash for simulation."
echo

TX_JSON_A=$(cast send "$ESCROW" \
  "pay(bytes32,bytes)" \
  "$PAYMENT_ID_A" \
  "$PAYLOAD_HEX_A" \
  --rpc-url "$RPC" \
  --private-key "$PRIVATE_KEY" \
  --json 2>&1)

TX_HASH_A=$(echo "$TX_JSON_A" | jq -r '.transactionHash')
success "Transaction: $TX_HASH_A"
echo -e "  ${DIM}View on Blockscout: https://base-sepolia.blockscout.com/tx/$TX_HASH_A${RESET}"

echo
step "Step 4 — Waiting for confirmation..."
cast receipt "$TX_HASH_A" --rpc-url "$RPC" --confirmations 1 > /dev/null 2>&1
success "Confirmed on-chain"

pause

step "Step 5 — Run CRE workflow simulation (EVM trigger, index 1)"
info "The simulator loads the SubmissionPaid event from the confirmed tx,"
info "decodes the payload from the log data, and runs all 5 pipeline phases."
sep

CRE_ETH_PRIVATE_KEY="$PRIVATE_KEY" AI_API_KEY="$AI_API_KEY" \
  cre workflow simulate satgaz-threat-intel \
  --target=staging-settings \
  --non-interactive \
  --trigger-index 1 \
  --evm-tx-hash "$TX_HASH_A" \
  --evm-event-index 0 \
  2>&1

sep
success "Path A complete — EVM Log Trigger simulation finished"

pause

# =============================================================================
#  PART 5 — LIVE DEMO: PATH B  (HTTP Trigger)
# =============================================================================
header "PART 5 — LIVE DEMO: PATH B  (HTTP Trigger)"

echo
echo -e "  ${BOLD}Same payment, different entry point.${RESET}"
info "Step 1 — Reuse the same on-chain payment from Path A."
info "The paymentTxHash field is set to the real tx so the HTTP handler"
info "can verify it on-chain before processing the submission."
echo

# Build an HTTP-flavoured payload that includes the real paymentTxHash
PAYLOAD_B="{\"targetProtocol\":\"0x1111111111111111111111111111111111111111\",\"targetChain\":\"ethereum-testnet-sepolia\",\"threatType\":\"RUG_PREP\",\"paymentTxHash\":\"$TX_HASH_A\",\"evidence\":{\"description\":\"Admin moved 80% of treasury to a fresh wallet within the last 24 hours\",\"txHashes\":[\"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"],\"contractAddresses\":[\"0x2222222222222222222222222222222222222222\"],\"additionalData\":\"Team members spotted selling tokens on secondary markets\"},\"payoutAddress\":\"0x9999999999999999999999999999999999999999\"}"

echo -e "  ${DIM}paymentTxHash set to: $TX_HASH_A${RESET}"

echo
step "Step 2 — Run CRE workflow simulation (HTTP trigger, index 0)"
info "The HTTP handler will:"
info "  1. Decode and validate the JSON payload"
info "  2. Resolve the ESCROW chain (Base Sepolia) from config.chainSelectorName"
info "  3. Call getTransactionReceipt for the paymentTxHash on Base Sepolia"
info "  4. Check the receipt logs for a SubmissionPaid event from the escrow"
info "  5. Reject if wrong contract, reverted tx, or missing event"
info "  6. Then switch to the TARGET chain (Ethereum Sepolia) for threat analysis"
info "  → Chain separation: escrow on Base Sepolia, threat evidence on Eth Sepolia"
sep

CRE_ETH_PRIVATE_KEY="$PRIVATE_KEY" AI_API_KEY="$AI_API_KEY" \
  cre workflow simulate satgaz-threat-intel \
  --target=staging-settings \
  --non-interactive \
  --trigger-index 0 \
  --http-payload "$PAYLOAD_B" \
  2>&1

sep
success "Path B complete — HTTP Trigger simulation finished"

pause

# =============================================================================
#  SUMMARY
# =============================================================================
header "SUMMARY"

echo
echo -e "  ${BOLD}Both triggers ran the same pipeline. Here's what just happened:${RESET}"
echo
echo -e "  ${GREEN}✓${RESET}  Payment gate enforced — zero-cost spam is impossible"
echo -e "  ${GREEN}✓${RESET}  EVM Log Trigger: payload decoded directly from on-chain event log"
echo -e "  ${GREEN}✓${RESET}  HTTP Trigger: payment verified via receipt lookup before processing"
echo -e "  ${GREEN}✓${RESET}  Phase 1 — EVM calls verified (or flagged) each evidence tx hash"
echo -e "  ${GREEN}✓${RESET}  Phase 2 — DeFiLlama TVL enrichment fetched over public HTTP"
echo -e "  ${GREEN}✓${RESET}  Phase 3 — Confidential HTTP to OpenAI (key never leaves DON vault)"
echo -e "  ${GREEN}✓${RESET}  Phase 4 — Deterministic scoring engine produced a reproducible score"
echo -e "  ${GREEN}✓${RESET}  Phase 5 — Score below publish threshold (expected with dummy evidence)"
echo
echo -e "  ${DIM}Transaction on Base Sepolia:${RESET}"
echo -e "  ${CYAN}https://base-sepolia.blockscout.com/tx/$TX_HASH_A${RESET}"
echo
echo -e "  ${BOLD}Next steps:${RESET}"
echo -e "  • Submit with real evidence tx hashes to see Phase 1 verify them"
echo -e "  • Set a real AI_API_KEY to see Phase 3 produce AI-assisted reasoning"
echo -e "  • Deploy ThreatOracle + BountyVault to see Phase 5 write on-chain"
echo -e "  • Use the frontend (${CYAN}cd satgaz-app && bun dev${RESET}) for the wallet UI"
echo
echo -e "${GREEN}${BOLD}  Demo complete.${RESET}"
echo
