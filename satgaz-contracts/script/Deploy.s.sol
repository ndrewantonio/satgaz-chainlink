// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {SubmissionEscrow} from "../src/SubmissionEscrow.sol";
import {ThreatOracle} from "../src/ThreatOracle.sol";
import {BountyVault} from "../src/BountyVault.sol";
import {MockERC20} from "../src/MockERC20.sol";

/**
 * @title Deploy
 * @notice Deploys the full SatGaz contract suite.
 *
 * Usage (Sepolia):
 *   forge script script/Deploy.s.sol \
 *     --rpc-url sepolia \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ETHERSCAN_API_KEY \
 *     -vvvv
 *
 * Environment variables (set in .env):
 *   PRIVATE_KEY          - Deployer private key (required)
 *   SEPOLIA_RPC_URL      - RPC endpoint
 *   ETHERSCAN_API_KEY    - For --verify
 *   PAYMENT_TOKEN        - Existing ERC-20 address; leave unset to deploy MockERC20
 *   SUBMISSION_FEE       - Fee in token base units (default: 1_000_000 = 1 USDC)
 *   WORKFLOW_ADDRESS     - CRE workflow execution address; defaults to deployer
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        address tokenAddress = vm.envOr("PAYMENT_TOKEN", address(0));
        uint256 submissionFee = vm.envOr("SUBMISSION_FEE", uint256(1_000_000));
        address workflowAddress = vm.envOr("WORKFLOW_ADDRESS", deployer);

        console.log("=== SatGaz Deploy ===");
        console.log("Deployer         :", deployer);
        console.log("Workflow/Publisher:", workflowAddress);
        console.log("Submission fee   :", submissionFee);

        vm.startBroadcast(deployerKey);

        // 1. Payment token
        MockERC20 mockToken;
        if (tokenAddress == address(0)) {
            mockToken = new MockERC20("Mock USDC", "mUSDC");
            tokenAddress = address(mockToken);
            mockToken.mint(deployer, 1_000_000 * 1e6);
            console.log("MockERC20 deployed:", tokenAddress);
        } else {
            console.log("Using existing token:", tokenAddress);
        }

        // 2. SubmissionEscrow
        SubmissionEscrow escrow = new SubmissionEscrow(
            tokenAddress,
            submissionFee
        );
        console.log("SubmissionEscrow  :", address(escrow));

        // 3. ThreatOracle
        ThreatOracle oracle = new ThreatOracle(workflowAddress);
        console.log("ThreatOracle      :", address(oracle));

        // 4. BountyVault
        BountyVault vault = new BountyVault(tokenAddress, workflowAddress);
        console.log("BountyVault       :", address(vault));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("Chain ID         :", block.chainid);
        console.log("PaymentToken     :", tokenAddress);
        console.log("SubmissionEscrow :", address(escrow));
        console.log("ThreatOracle     :", address(oracle));
        console.log("BountyVault      :", address(vault));
        console.log(
            "\n-- Paste into config.staging.json / config.production.json --"
        );
        console.log('"submissionEscrowAddress": "%s"', address(escrow));
        console.log('"threatOracleAddress":     "%s"', address(oracle));
        console.log('"bountyVaultAddress":      "%s"', address(vault));
        console.log("\n-- Paste into satgaz-app/.env --");
        console.log("VITE_ESCROW_ADDRESS=%s", address(escrow));
        console.log("VITE_PAYMENT_TOKEN_ADDRESS=%s", tokenAddress);
    }
}
