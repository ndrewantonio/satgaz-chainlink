import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";

// A non-empty fallback is required — WalletConnect throws if projectId is "".
// For local dev, any non-empty string allows injected wallets (MetaMask etc.)
// to work. Set VITE_WALLETCONNECT_PROJECT_ID in .env for full WalletConnect support.
export const wagmiConfig = getDefaultConfig({
  appName: "SatGaz Threat Intel",
  projectId:
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "satgaz-local-dev",
  chains: [baseSepolia],
  ssr: false,
});
