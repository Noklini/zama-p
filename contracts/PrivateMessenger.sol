// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint256, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaSepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PrivateMessenger
/// @notice A simple private messaging contract using FHE encryption
/// @dev Messages are encrypted end-to-end, only sender and recipient can decrypt
contract PrivateMessenger is ZamaSepoliaConfig {
    /// @notice Represents an encrypted message
    struct Message {
        address sender;
        address recipient;
        euint256 encryptedContent;
        uint256 timestamp;
    }

    /// @notice Mapping from user address to their received messages
    mapping(address => Message[]) private _inbox;

    /// @notice Mapping from user address to their sent messages
    mapping(address => Message[]) private _outbox;

    /// @notice Emitted when a new message is sent
    event MessageSent(
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    /// @notice Error thrown when recipient is zero address
    error InvalidRecipient();

    /// @notice Error thrown when sender tries to message themselves
    error CannotMessageSelf();

    /// @notice Send an encrypted message to another user
    /// @param to The recipient's address
    /// @param encryptedContent The encrypted message content
    /// @param inputProof Proof for validating the encrypted input
    function sendMessage(
        address to,
        externalEuint256 encryptedContent,
        bytes calldata inputProof
    ) external {
        if (to == address(0)) revert InvalidRecipient();
        if (to == msg.sender) revert CannotMessageSelf();

        // Validate and convert the encrypted input
        euint256 content = FHE.fromExternal(encryptedContent, inputProof);

        // Create the message
        Message memory newMessage = Message({
            sender: msg.sender,
            recipient: to,
            encryptedContent: content,
            timestamp: block.timestamp
        });

        // Store in recipient's inbox and sender's outbox
        _inbox[to].push(newMessage);
        _outbox[msg.sender].push(newMessage);

        // Grant ACL permissions - both sender and recipient can decrypt
        FHE.allowThis(content);
        FHE.allow(content, msg.sender);
        FHE.allow(content, to);

        emit MessageSent(msg.sender, to, block.timestamp);
    }

    /// @notice Get the number of messages in user's inbox
    /// @param user The user's address
    /// @return The count of received messages
    function getInboxCount(address user) external view returns (uint256) {
        return _inbox[user].length;
    }

    /// @notice Get the number of messages in user's outbox
    /// @param user The user's address
    /// @return The count of sent messages
    function getOutboxCount(address user) external view returns (uint256) {
        return _outbox[user].length;
    }

    /// @notice Get a specific message from inbox
    /// @param user The user's address
    /// @param index The message index
    /// @return sender The sender's address
    /// @return encryptedContent The encrypted message content handle
    /// @return timestamp When the message was sent
    function getInboxMessage(
        address user,
        uint256 index
    )
        external
        view
        returns (address sender, euint256 encryptedContent, uint256 timestamp)
    {
        require(index < _inbox[user].length, "Index out of bounds");
        Message storage message = _inbox[user][index];
        return (message.sender, message.encryptedContent, message.timestamp);
    }

    /// @notice Get a specific message from outbox
    /// @param user The user's address
    /// @param index The message index
    /// @return recipient The recipient's address
    /// @return encryptedContent The encrypted message content handle
    /// @return timestamp When the message was sent
    function getOutboxMessage(
        address user,
        uint256 index
    )
        external
        view
        returns (
            address recipient,
            euint256 encryptedContent,
            uint256 timestamp
        )
    {
        require(index < _outbox[user].length, "Index out of bounds");
        Message storage message = _outbox[user][index];
        return (message.recipient, message.encryptedContent, message.timestamp);
    }

    /// @notice Get encrypted content handles for all inbox messages
    /// @dev Caller must have ACL permission to decrypt each handle
    /// @param user The user's address
    /// @return handles Array of encrypted content handles
    function getInboxHandles(
        address user
    ) external view returns (euint256[] memory handles) {
        uint256 length = _inbox[user].length;
        handles = new euint256[](length);
        for (uint256 i = 0; i < length; i++) {
            handles[i] = _inbox[user][i].encryptedContent;
        }
    }
}
