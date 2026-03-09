// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ThreatOracle
 * @notice On-chain registry of published threat intelligence verdicts.
 *         Only the authorized `publisher` address (the CRE workflow execution
 *         account or a trusted relayer) can write new records.
 */
contract ThreatOracle {
    address public owner;

    /// @notice Address authorized to publish threat verdicts (CRE workflow).
    address public publisher;

    struct ThreatRecord {
        uint8 threatType; // maps to ThreatType enum in workflow
        uint8 threatLevel; // 0=CRITICAL 1=HIGH 2=MEDIUM 3=LOW
        uint8 confidence; // 0=HIGH 1=MEDIUM 2=LOW
        uint256 timestamp;
    }

    /// @dev protocol address → latest threat record
    mapping(address => ThreatRecord) private _threats;

    event ThreatPublished(
        address indexed protocol,
        uint8 threatType,
        uint8 threatLevel,
        uint8 confidence,
        uint256 timestamp
    );

    event PublisherUpdated(
        address indexed oldPublisher,
        address indexed newPublisher
    );

    error NotOwner();
    error NotPublisher();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyPublisher() {
        if (msg.sender != publisher) revert NotPublisher();
        _;
    }

    constructor(address _publisher) {
        if (_publisher == address(0)) revert ZeroAddress();
        owner = msg.sender;
        publisher = _publisher;
    }

    function publishThreat(
        address protocol,
        uint8 threatType,
        uint8 threatLevel,
        uint8 confidence,
        uint256 timestamp
    ) external onlyPublisher {
        _threats[protocol] = ThreatRecord(
            threatType,
            threatLevel,
            confidence,
            timestamp
        );
        emit ThreatPublished(
            protocol,
            threatType,
            threatLevel,
            confidence,
            timestamp
        );
    }

    function getLatestThreat(
        address protocol
    )
        external
        view
        returns (
            uint8 threatType,
            uint8 threatLevel,
            uint8 confidence,
            uint256 timestamp
        )
    {
        ThreatRecord memory r = _threats[protocol];
        return (r.threatType, r.threatLevel, r.confidence, r.timestamp);
    }

    function setPublisher(address _publisher) external onlyOwner {
        if (_publisher == address(0)) revert ZeroAddress();
        emit PublisherUpdated(publisher, _publisher);
        publisher = _publisher;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
