// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {SubmissionEscrow} from "../src/SubmissionEscrow.sol";
import {MockERC20} from "../src/MockERC20.sol";

contract SubmissionEscrowTest is Test {
    event SubmissionPaid(
        address indexed submitter,
        bytes32 indexed paymentId,
        uint256 feePaid,
        uint256 timestamp,
        bytes payload
    );

    MockERC20 token;
    SubmissionEscrow escrow;

    address owner = address(this);
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    uint256 constant FEE = 1_000_000; // 1 mUSDC

    function setUp() public {
        token = new MockERC20("Mock USDC", "mUSDC");
        escrow = new SubmissionEscrow(address(token), FEE);
        token.mint(alice, 10 * FEE);
    }

    function test_pay_emitsSubmissionPaid() public {
        bytes32 paymentId = keccak256("test-payload");
        bytes memory payload = bytes('{"targetProtocol":"Uniswap"}');

        vm.startPrank(alice);
        token.approve(address(escrow), FEE);

        vm.expectEmit(true, true, false, true, address(escrow));
        emit SubmissionPaid(alice, paymentId, FEE, block.timestamp, payload);

        escrow.pay(paymentId, payload);
        vm.stopPrank();
    }

    function test_pay_transfersTokens() public {
        bytes32 paymentId = keccak256("test-payload-2");
        bytes memory payload = bytes("{}");

        vm.startPrank(alice);
        token.approve(address(escrow), FEE);
        escrow.pay(paymentId, payload);
        vm.stopPrank();

        assertEq(token.balanceOf(address(escrow)), FEE);
        assertEq(token.balanceOf(alice), 9 * FEE);
    }

    function test_pay_revertsWithoutApproval() public {
        bytes32 paymentId = keccak256("no-approval");
        bytes memory payload = bytes("{}");

        vm.startPrank(alice);
        vm.expectRevert(bytes("ERC20: insufficient allowance"));
        escrow.pay(paymentId, payload);
        vm.stopPrank();
    }

    function test_pay_revertsOnInsufficientBalance() public {
        bytes32 paymentId = keccak256("broke");
        bytes memory payload = bytes("{}");

        vm.startPrank(bob);
        token.approve(address(escrow), FEE);
        vm.expectRevert(bytes("ERC20: insufficient balance"));
        escrow.pay(paymentId, payload);
        vm.stopPrank();
    }

    function test_setFee_updatesValue() public {
        escrow.setFee(2_000_000);
        assertEq(escrow.submissionFee(), 2_000_000);
    }

    function test_setFee_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(SubmissionEscrow.NotOwner.selector);
        escrow.setFee(99);
    }

    function test_withdraw_sendsBalance() public {
        vm.startPrank(alice);
        token.approve(address(escrow), FEE);
        escrow.pay(keccak256("w1"), bytes("{}"));
        vm.stopPrank();

        uint256 beforeBob = token.balanceOf(bob);
        escrow.withdraw(bob);
        assertEq(token.balanceOf(bob), beforeBob + FEE);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function test_withdraw_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(SubmissionEscrow.NotOwner.selector);
        escrow.withdraw(alice);
    }

    function test_withdraw_revertsOnZeroAddress() public {
        vm.expectRevert(SubmissionEscrow.ZeroAddress.selector);
        escrow.withdraw(address(0));
    }

    function test_transferOwnership() public {
        escrow.transferOwnership(alice);
        assertEq(escrow.owner(), alice);
    }

    function test_transferOwnership_revertsOnZeroAddress() public {
        vm.expectRevert(SubmissionEscrow.ZeroAddress.selector);
        escrow.transferOwnership(address(0));
    }

    function test_transferOwnership_revertsIfNotOwner() public {
        vm.prank(alice);
        vm.expectRevert(SubmissionEscrow.NotOwner.selector);
        escrow.transferOwnership(alice);
    }
}
