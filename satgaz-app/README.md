# satgaz-app

React + TypeScript + Vite frontend for the SatGaz threat intelligence protocol. Users connect their wallet, fill out a threat report, and pay the submission fee to the `SubmissionEscrow` contract — which automatically triggers the Chainlink CRE analysis workflow.

---

## Overview

The app supports two submission flows:

| Flow     | Description                                                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EVM**  | Full on-chain path. The app calls `SubmissionEscrow.pay(paymentId, payload)` — the CRE EVM Log Trigger picks up the `SubmissionPaid` event automatically. |
| **HTTP** | The user calls `pay()` to obtain a payment receipt, then POSTs the threat payload + `paymentTxHash` directly to the CRE HTTP trigger endpoint.            |

Both flows pass through the same five-phase analysis pipeline in the CRE runtime.

---

## Tech Stack

| Layer                      | Library                                                     |
| -------------------------- | ----------------------------------------------------------- |
| UI framework               | React 19 + TypeScript                                       |
| Build tool                 | Vite 8                                                      |
| Wallet + chain interaction | [wagmi v2](https://wagmi.sh/) + [viem v2](https://viem.sh/) |
| Wallet connection UI       | [RainbowKit v2](https://www.rainbowkit.com/)                |
| Data fetching              | [@tanstack/react-query](https://tanstack.com/query)         |

---

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- A deployed `SubmissionEscrow` contract (see [satgaz-contracts](../satgaz-contracts/README.md))
- A funded wallet on Base Sepolia (or whichever chain the escrow is deployed on)

---

## Installation

```bash
cd satgaz-app
npm install
```

---

## Environment Variables

Create a `.env` file in `satgaz-app/`:

```bash
cp .env.example .env
```

| Variable                 | Required       | Description                                  |
| ------------------------ | -------------- | -------------------------------------------- |
| `VITE_ESCROW_ADDRESS`    | Yes            | Deployed `SubmissionEscrow` contract address |
| `VITE_WORKFLOW_HTTP_URL` | HTTP flow only | CRE workflow HTTP trigger endpoint URL       |

---

## Development

```bash
npm run dev       # start dev server at http://localhost:5173
npm run build     # production build
npm run preview   # preview production build locally
npm run lint      # ESLint
```

---

## Project Structure

```
satgaz-app/
├── src/
│   ├── components/
│   │   ├── SubmissionForm.tsx   # Threat report form (protocol, threat type, evidence)
│   │   ├── EvmPaymentFlow.tsx   # EVM flow — approve + pay() + track tx
│   │   ├── HttpPaymentFlow.tsx  # HTTP flow — pay() + POST to CRE endpoint
│   │   └── FlowToggle.tsx       # Toggles between EVM and HTTP flow
│   ├── hooks/
│   │   └── usePayment.ts        # wagmi hooks for approval + pay()
│   ├── lib/
│   │   ├── contracts.ts         # Contract address + ABI constants
│   │   └── wagmi.ts             # wagmi + RainbowKit config
│   └── types/
│       └── payload.ts           # RequestPayload type + ThreatType enum
└── .env.example
```

---

## Submission Flow — EVM

```
1. Connect wallet (RainbowKit)
2. Fill threat report form
   - Target protocol name
   - Target chain
   - Threat type (RUG_PREP | ADMIN_KEY | FUND_DRAIN | UPGRADE_VULN | ORACLE_MANIP)
   - Evidence: tx hashes, contract addresses, description
   - Payout address
3. Approve SubmissionEscrow to spend fee token
4. Call SubmissionEscrow.pay(keccak256(payload), payload)
   └─► SubmissionPaid event emitted
       └─► Chainlink CRE EVM Log Trigger fires automatically
           └─► Analysis pipeline runs
               └─► ThreatOracle + BountyVault updated
```

## Submission Flow — HTTP

```
1. Connect wallet
2. Fill threat report form
3. Call SubmissionEscrow.pay() to register payment receipt
4. App POSTs { ...payload, paymentTxHash } to VITE_WORKFLOW_HTTP_URL
   └─► CRE HTTP Trigger fires
       └─► verifyPayment() checks the SubmissionPaid event on-chain
           └─► Same analysis pipeline runs
```

---

## Threat Types

| Value          | Description                             |
| -------------- | --------------------------------------- |
| `RUG_PREP`     | Signs of pre-rug liquidity manipulation |
| `ADMIN_KEY`    | Suspicious admin key activity           |
| `FUND_DRAIN`   | Active or imminent fund drain           |
| `UPGRADE_VULN` | Malicious or vulnerable upgrade pattern |
| `ORACLE_MANIP` | Oracle price manipulation               |

---

## Deployed Contracts

The default `VITE_ESCROW_ADDRESS` points to the Base Sepolia staging deployment:

```
SubmissionEscrow: 0xf217CE89D15455e68276718e499eC87bF9b5b207
```

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
