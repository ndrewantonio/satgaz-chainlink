## satgaz-contracts

Solidity smart contracts for the SatGaz threat intelligence protocol, built and tested with [Foundry](https://book.getfoundry.sh/).

These contracts form the on-chain infrastructure that gates threat submissions, records verified verdicts, and pays out bounties. The Chainlink CRE workflow ([`satgaz-threat-intel`](../satgaz-threat-intel/README.md)) is the only authorized writer for `ThreatOracle` and `BountyVault`.

---

## Contracts

### `SubmissionEscrow`

The spam and Sybil gate. Users call `pay(paymentId, payload)` to register a threat submission. The contract transfers the fee in ERC-20 tokens and emits `SubmissionPaid` with the full JSON payload encoded in the event log data.

The **Chainlink CRE EVM Log Trigger** in `satgaz-threat-intel` watches for this event and launches the analysis pipeline automatically — no manual step required.

```solidity
constructor(address _token, uint256 _fee)

function pay(bytes32 paymentId, bytes calldata payload) external
//  paymentId  — keccak256(payload), binds the fee to a specific submission
//  payload    — UTF-8 encoded JSON of the RequestPayload struct

event SubmissionPaid(
    address indexed submitter,
    bytes32 indexed paymentId,
    uint256 feePaid,
    uint256 timestamp,
    bytes payload
)
```

**Base Sepolia staging:** `0xf217CE89D15455e68276718e499eC87bF9b5b207`

---

### `ThreatOracle`

On-chain registry of verified threat verdicts. Only the authorized `publisher` address — the CRE workflow execution account — may write records via `publishThreat`. Anyone may read the latest record for any protocol.

```solidity
constructor(address _publisher)

function publishThreat(
    address protocol,
    uint8 threatType,
    uint8 threatLevel,
    uint8 confidence,
    uint256 timestamp
) external onlyPublisher

function getLatestThreat(address protocol)
    external view
    returns (uint8 threatType, uint8 threatLevel, uint8 confidence, uint256 timestamp)
```

---

### `BountyVault`

Holds ERC-20 bounty funds and pays them out when the CRE workflow confirms a valid high-severity threat. Only the authorized `workflow` address may call `payBounty`. Anyone may fund the vault.

```solidity
constructor(address _token, address _workflow)

function payBounty(address recipient, uint256 amount) external onlyWorkflow
function fund(uint256 amount) external          // anyone may fund
function getVaultBalance() external view returns (uint256)
```

---

### `MockERC20`

A mintable ERC-20 with 6 decimals (mimicking USDC) for testnet deployments. Deployed automatically by the deploy script when `PAYMENT_TOKEN` is not set.

---

## Contract Architecture

```
┌───────────────────────────────────────────────────────┐
│                    satgaz-app (UI)                     │
│   approve(escrow, fee)  →  SubmissionEscrow.pay(...)   │
└───────────────────────────┬───────────────────────────┘
                            │ SubmissionPaid event
                            ▼
            ┌───────────────────────────────┐
            │   Chainlink CRE Runtime        │
            │   satgaz-threat-intel workflow │
            │                               │
            │   EVM Log Trigger fires        │
            │   → validate → enrich → AI    │
            │   → score → verdict           │
            └─────────────┬─────────────────┘
                          │ EVMClient.writeReport()
              ┌───────────┴────────────┐
              ▼                        ▼
  ┌───────────────────┐    ┌───────────────────┐
  │   ThreatOracle    │    │   BountyVault      │
  │  publishThreat()  │    │   payBounty()      │
  └───────────────────┘    └────────┬──────────┘
                                    │ token transfer
                                    ▼
                              whistleblower
```

---

## Prerequisites

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

---

## Installation

```bash
cd satgaz-contracts
forge install     # installs forge-std from lib/
forge build
```

---

## Environment Variables

```bash
cp .env.example .env
```

| Variable            | Required        | Default          | Description                                  |
| ------------------- | --------------- | ---------------- | -------------------------------------------- |
| `PRIVATE_KEY`       | Yes             | —                | Deployer private key (0x-prefixed)           |
| `SEPOLIA_RPC_URL`   | Yes             | —                | Alchemy / Infura RPC for Sepolia             |
| `MAINNET_RPC_URL`   | No              | —                | Mainnet RPC                                  |
| `ETHERSCAN_API_KEY` | `--verify` only | —                | For contract verification                    |
| `PAYMENT_TOKEN`     | No              | deploy MockERC20 | Existing ERC-20 address                      |
| `SUBMISSION_FEE`    | No              | `1000000`        | Fee in token base units (1 USDC = 1 000 000) |
| `WORKFLOW_ADDRESS`  | No              | deployer         | CRE workflow execution address               |

---

## Deploy

```bash
# Load environment
source .env

# Dry-run (no broadcast)
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL -vvvv

# Broadcast + verify
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

The script prints addresses in a format ready to paste into `config.staging.json` and `satgaz-app/.env`.

### Post-deploy checklist

1. Copy `SubmissionEscrow`, `ThreatOracle`, `BountyVault` addresses into `satgaz-threat-intel/config.staging.json`
2. Set `VITE_ESCROW_ADDRESS` in `satgaz-app/.env`
3. Fund `BountyVault` with the payment token for bounty payouts
4. Set `WORKFLOW_ADDRESS` to the CRE workflow execution account so it can write to `ThreatOracle` and `BountyVault`

---

## Testing

```bash
forge test -vvv
```

```
Running 11 tests for test/SubmissionEscrow.t.sol:SubmissionEscrowTest
[PASS] test_pay_emitsSubmissionPaid()
[PASS] test_pay_transfersTokens()
[PASS] test_pay_revertsWithoutApproval()
[PASS] test_pay_revertsOnInsufficientBalance()
[PASS] test_setFee_updatesValue()
[PASS] test_setFee_revertsIfNotOwner()
[PASS] test_withdraw_sendsBalance()
[PASS] test_withdraw_revertsIfNotOwner()
[PASS] test_withdraw_revertsOnZeroAddress()
[PASS] test_transferOwnership()
[PASS] test_transferOwnership_revertsOnZeroAddress()
[PASS] test_transferOwnership_revertsIfNotOwner()
```

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
