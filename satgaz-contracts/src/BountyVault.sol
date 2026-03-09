// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title BountyVault
 * @notice Holds ERC-20 bounty funds and pays them out on behalf of the
 *         CRE threat-intel workflow when a valid report is confirmed.
 *         Only the authorized `workflow` address may call payBounty.
 */
contract BountyVault {
    address public owner;
    IERC20 public immutable token;

    /// @notice Address authorized to trigger bounty payouts (CRE workflow).
    address public workflow;

    event BountyPaid(address indexed recipient, uint256 amount);
    event WorkflowUpdated(
        address indexed oldWorkflow,
        address indexed newWorkflow
    );
    event VaultFunded(address indexed funder, uint256 amount);

    error NotOwner();
    error NotWorkflow();
    error ZeroAddress();
    error TransferFailed();
    error InsufficientBalance();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyWorkflow() {
        if (msg.sender != workflow) revert NotWorkflow();
        _;
    }

    constructor(address _token, address _workflow) {
        if (_token == address(0) || _workflow == address(0))
            revert ZeroAddress();
        owner = msg.sender;
        token = IERC20(_token);
        workflow = _workflow;
    }

    function payBounty(
        address recipient,
        uint256 amount
    ) external onlyWorkflow {
        if (amount == 0) return;
        if (token.balanceOf(address(this)) < amount)
            revert InsufficientBalance();
        if (!token.transfer(recipient, amount)) revert TransferFailed();
        emit BountyPaid(recipient, amount);
    }

    function getVaultBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function fund(uint256 amount) external {
        if (!token.transferFrom(msg.sender, address(this), amount))
            revert TransferFailed();
        emit VaultFunded(msg.sender, amount);
    }

    function setWorkflow(address _workflow) external onlyOwner {
        if (_workflow == address(0)) revert ZeroAddress();
        emit WorkflowUpdated(workflow, _workflow);
        workflow = _workflow;
    }

    function withdrawEmergency(address to) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = token.balanceOf(address(this));
        if (!token.transfer(to, bal)) revert TransferFailed();
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
