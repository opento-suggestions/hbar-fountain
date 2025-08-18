// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * HBAR Transfer Example Contract
 * Following Hedera tutorial for sending and receiving HBAR
 * This demonstrates the core patterns our Fountain Protocol will use
 */

contract HbarTransferExample {
    address public owner;
    
    // Events for tracking transfers
    event HbarReceived(address sender, uint256 amount);
    event HbarSent(address recipient, uint256 amount);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ═══════════ RECEIVING HBAR ═══════════
    
    /**
     * Receive HBAR when sent directly to contract
     */
    receive() external payable {
        emit HbarReceived(msg.sender, msg.value);
    }
    
    /**
     * Fallback function for receiving HBAR
     */
    fallback() external payable {
        emit HbarReceived(msg.sender, msg.value);
    }
    
    /**
     * Explicit payable function to receive HBAR
     */
    function depositHbar() external payable {
        require(msg.value > 0, "Must send some HBAR");
        emit HbarReceived(msg.sender, msg.value);
    }
    
    // ═══════════ SENDING HBAR ═══════════
    
    /**
     * Method 1: Using transfer() - reverts on failure
     */
    function transferHbar(address payable _receiverAddress, uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient contract balance");
        _receiverAddress.transfer(_amount);
        emit HbarSent(_receiverAddress, _amount);
    }
    
    /**
     * Method 2: Using send() - returns boolean
     */
    function sendHbar(address payable _receiverAddress, uint256 _amount) external onlyOwner returns (bool) {
        require(address(this).balance >= _amount, "Insufficient contract balance");
        bool success = _receiverAddress.send(_amount);
        if (success) {
            emit HbarSent(_receiverAddress, _amount);
        }
        return success;
    }
    
    /**
     * Method 3: Using call() - recommended approach
     */
    function callHbar(address payable _receiverAddress, uint256 _amount) external onlyOwner returns (bool) {
        require(address(this).balance >= _amount, "Insufficient contract balance");
        (bool success, ) = _receiverAddress.call{value: _amount}("");
        if (success) {
            emit HbarSent(_receiverAddress, _amount);
        }
        return success;
    }
    
    // ═══════════ UTILITY FUNCTIONS ═══════════
    
    /**
     * Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * Get sender's balance (for testing)
     */
    function getSenderBalance() external view returns (uint256) {
        return msg.sender.balance;
    }
    
    /**
     * Emergency withdraw (owner only)
     */
    function withdrawAll() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No HBAR to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit HbarSent(owner, balance);
    }
}