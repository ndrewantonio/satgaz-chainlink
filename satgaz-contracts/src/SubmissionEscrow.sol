// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title SubmissionEscrow
 * @notice Users pay a fee in ERC-20 tokens to authorize a threat submission.
 *         On successful payment the SubmissionPaid event is emitted.
 *         The CRE EVM Log Trigger listens for this event and automatically
 *         starts the satgaz threat-intel workflow.
 */
contract SubmissionEscrow {
    address public owner;
    IERC20 public immutable paymentToken;
    uint256 public submissionFee;

    event SubmissionPaid(
        address indexed submitter,
        bytes32 indexed paymentId,
        uint256 feePaid,
        uint256 timestamp,
        bytes payload
    );

    error TransferFailed();
    error NotOwner();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _token, uint256 _fee) {
        owner = msg.sender;
        paymentToken = IERC20(_token);
        submissionFee = _fee;
    }

    function pay(bytes32 paymentId, bytes calldata payload) external {
        if (
            !paymentToken.transferFrom(msg.sender, address(this), submissionFee)
        ) revert TransferFailed();
        emit SubmissionPaid(
            msg.sender,
            paymentId,
            submissionFee,
            block.timestamp,
            payload
        );
    }

    function setFee(uint256 _fee) external onlyOwner {
        submissionFee = _fee;
    }

    function withdraw(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 balance = paymentToken.balanceOf(address(this));
        if (!paymentToken.transfer(to, balance)) revert TransferFailed();
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
