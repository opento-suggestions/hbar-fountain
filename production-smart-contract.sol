// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * Fountain Protocol Production Smart Contract
 * Direct blockchain interaction - no web app or server needed
 * Users interact directly with contract using their wallets
 * 
 * Contract Address: [TO BE DEPLOYED]
 * Network: Hedera Testnet
 * 
 * User Flow:
 * 1. Connect wallet to Hedera
 * 2. Send 1 HBAR to contract.createMembership()
 * 3. Receive DRIP token automatically
 * 4. Claim WISH tokens via contract.claimWish()
 * 5. Redeem DRIP for HBAR via contract.redeemDrip()
 */

import "./HederaResponseCodes.sol";
import "./IHederaTokenService.sol";
import "./HederaTokenService.sol";
import "./ExpiryHelper.sol";

contract FountainProtocolContract is HederaTokenService, ExpiryHelper {
    
    // ═══════════ STATE VARIABLES ═══════════
    
    address public treasury;
    address public owner;
    
    // Token addresses (will be set after deployment)
    address public dripToken;    // Membership token (non-transferable)
    address public wishToken;    // Reward token (redeemable)
    
    // Protocol parameters
    uint256 public constant MEMBERSHIP_DEPOSIT = 1 ether; // 1 HBAR
    uint256 public constant MAX_WISH_PER_DRIP = 1000;
    uint256 public constant WISH_TO_HBAR_RATE = 1000000000000000; // 0.001 HBAR per WISH (in wei)
    uint256 public constant MEMBER_REFUND_RATE = 80; // 80% (0.8 HBAR)
    uint256 public constant TREASURY_FEE_RATE = 20;  // 20% (0.2 HBAR)
    
    // Member tracking
    struct Member {
        uint256 dripTokens;      // Should always be 1 for active members
        uint256 wishClaimed;     // Total WISH claimed (max 1000)
        uint256 remainingWish;   // Remaining WISH quota
        uint256 depositDate;     // When membership was created
        bool isActive;           // Active membership status
        bool capReached;         // Has reached 1000 WISH cap
    }
    
    mapping(address => Member) public members;
    mapping(address => bool) public hasMembership;
    
    // Contract state
    bool public paused = false;
    uint256 public totalMembers = 0;
    uint256 public totalWishClaimed = 0;
    uint256 public totalMembersAtCap = 0;
    
    // ═══════════ EVENTS ═══════════
    
    /**
     * Emitted when user creates membership with 1 HBAR deposit
     */
    event MembershipCreated(
        address indexed member,
        uint256 indexed dripTokens,
        uint256 indexed maxWishQuota,
        uint256 depositAmount,
        uint256 timestamp
    );
    
    /**
     * Emitted when member claims WISH tokens
     */
    event WishClaimed(
        address indexed member,
        uint256 indexed amount,
        uint256 indexed totalClaimed,
        uint256 remainingQuota,
        bool capReached
    );
    
    /**
     * Emitted when member redeems DRIP for HBAR (lifecycle completion)
     */
    event DripRedeemed(
        address indexed member,
        uint256 indexed refundAmount,
        uint256 indexed treasuryFee,
        uint256 totalWishClaimed,
        uint256 timestamp
    );
    
    /**
     * Emitted when AutoRelease is triggered (at 1000 WISH cap)
     */
    event AutoReleaseTriggered(
        address indexed member,
        uint256 indexed refundAmount,
        uint256 indexed finalWishClaimed,
        uint256 timestamp
    );
    
    // Error events for better UX
    event DepositError(address indexed user, string reason);
    event ClaimError(address indexed user, string reason);
    event RedeemError(address indexed user, string reason);
    
    // ═══════════ MODIFIERS ═══════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyTreasury() {
        require(msg.sender == treasury, "Only treasury");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    modifier validDeposit() {
        require(msg.value == MEMBERSHIP_DEPOSIT, "Must deposit exactly 1 HBAR");
        _;
    }
    
    modifier activeMember() {
        require(hasMembership[msg.sender] && members[msg.sender].isActive, "Not an active member");
        _;
    }
    
    modifier newMember() {
        require(!hasMembership[msg.sender], "Already has membership");
        _;
    }
    
    // ═══════════ CONSTRUCTOR ═══════════
    
    constructor(address _treasury) {
        require(_treasury != address(0), "Treasury cannot be zero address");
        
        owner = msg.sender;
        treasury = _treasury;
    }
    
    // ═══════════ CORE MEMBERSHIP FUNCTIONS ═══════════
    
    /**
     * Create membership by depositing exactly 1 HBAR
     * Automatically mints and transfers 1 DRIP token
     * No web app needed - users call this directly from wallet
     */
    function createMembership() 
        external 
        payable 
        notPaused
        validDeposit
        newMember
    {
        try this._createMembershipInternal(msg.sender) {
            // Success handled in internal function
        } catch {
            emit DepositError(msg.sender, "Membership creation failed");
            // Return deposit on failure
            payable(msg.sender).transfer(msg.value);
        }
    }
    
    /**
     * Internal membership creation logic
     */
    function _createMembershipInternal(address member) external {
        require(msg.sender == address(this), "Internal function");
        
        // 1. Mint 1 DRIP token to member
        _mintDripToken(member);
        
        // 2. Create member record
        members[member] = Member({
            dripTokens: 1,
            wishClaimed: 0,
            remainingWish: MAX_WISH_PER_DRIP,
            depositDate: block.timestamp,
            isActive: true,
            capReached: false
        });
        
        hasMembership[member] = true;
        totalMembers++;
        
        emit MembershipCreated(
            member,
            1,
            MAX_WISH_PER_DRIP,
            MEMBERSHIP_DEPOSIT,
            block.timestamp
        );
    }
    
    /**
     * Claim WISH reward tokens (up to 1000 lifetime cap)
     * No web app needed - users call this directly from wallet
     * 
     * @param amount Amount of WISH tokens to claim (1-500 per transaction)
     */
    function claimWish(uint256 amount) 
        external 
        notPaused
        activeMember
    {
        try this._claimWishInternal(msg.sender, amount) {
            // Success handled in internal function
        } catch {
            emit ClaimError(msg.sender, "WISH claim failed");
        }
    }
    
    /**
     * Internal WISH claiming logic
     */
    function _claimWishInternal(address member, uint256 amount) external {
        require(msg.sender == address(this), "Internal function");
        require(amount > 0 && amount <= 500, "Claim 1-500 WISH per transaction");
        
        Member storage memberData = members[member];
        require(!memberData.capReached, "Already reached 1000 WISH cap");
        require(memberData.remainingWish >= amount, "Insufficient WISH quota");
        
        // Update member data
        memberData.wishClaimed += amount;
        memberData.remainingWish -= amount;
        
        // Check if cap reached
        if (memberData.wishClaimed >= MAX_WISH_PER_DRIP) {
            memberData.capReached = true;
            totalMembersAtCap++;
            
            // Trigger AutoRelease
            _triggerAutoRelease(member);
        } else {
            // Regular WISH claim
            _mintWishTokens(member, amount);
            
            emit WishClaimed(
                member,
                amount,
                memberData.wishClaimed,
                memberData.remainingWish,
                false
            );
        }
        
        totalWishClaimed += amount;
    }
    
    /**
     * Redeem DRIP token for HBAR refund (manual redemption after cap)
     * No web app needed - users call this directly from wallet
     */
    function redeemDrip() 
        external 
        notPaused
        activeMember
    {
        try this._redeemDripInternal(msg.sender) {
            // Success handled in internal function
        } catch {
            emit RedeemError(msg.sender, "DRIP redemption failed");
        }
    }
    
    /**
     * Internal DRIP redemption logic
     */
    function _redeemDripInternal(address member) external {
        require(msg.sender == address(this), "Internal function");
        
        Member storage memberData = members[member];
        require(memberData.capReached, "Must reach 1000 WISH cap before redemption");
        require(memberData.dripTokens > 0, "No DRIP tokens to redeem");
        
        // Calculate refund (0.8 HBAR to member, 0.2 HBAR to Treasury)
        uint256 refundAmount = (MEMBERSHIP_DEPOSIT * MEMBER_REFUND_RATE) / 100;
        uint256 treasuryFee = (MEMBERSHIP_DEPOSIT * TREASURY_FEE_RATE) / 100;
        
        require(address(this).balance >= refundAmount, "Insufficient contract balance");
        
        // Burn DRIP token
        _burnDripToken(member);
        
        // Update member status
        memberData.dripTokens = 0;
        memberData.isActive = false;
        
        // Transfer refund to member
        payable(member).transfer(refundAmount);
        
        // Transfer fee to Treasury
        payable(treasury).transfer(treasuryFee);
        
        emit DripRedeemed(
            member,
            refundAmount,
            treasuryFee,
            memberData.wishClaimed,
            block.timestamp
        );
    }
    
    // ═══════════ AUTO-RELEASE MECHANISM ═══════════
    
    /**
     * Trigger AutoRelease when member reaches 1000 WISH cap
     * Automatically burns DRIP and refunds 0.8 HBAR
     */
    function _triggerAutoRelease(address member) internal {
        Member storage memberData = members[member];
        
        // Calculate refund
        uint256 refundAmount = (MEMBERSHIP_DEPOSIT * MEMBER_REFUND_RATE) / 100;
        uint256 treasuryFee = (MEMBERSHIP_DEPOSIT * TREASURY_FEE_RATE) / 100;
        
        require(address(this).balance >= refundAmount, "Insufficient balance for AutoRelease");
        
        // Mint final WISH tokens
        uint256 finalWishAmount = memberData.remainingWish;
        if (finalWishAmount > 0) {
            _mintWishTokens(member, finalWishAmount);
        }
        
        // Burn DRIP token
        _burnDripToken(member);
        
        // Update member status
        memberData.dripTokens = 0;
        memberData.isActive = false;
        memberData.remainingWish = 0;
        
        // Transfer refund and fee
        payable(member).transfer(refundAmount);
        payable(treasury).transfer(treasuryFee);
        
        emit AutoReleaseTriggered(
            member,
            refundAmount,
            MAX_WISH_PER_DRIP,
            block.timestamp
        );
        
        emit WishClaimed(
            member,
            finalWishAmount,
            MAX_WISH_PER_DRIP,
            0,
            true
        );
    }
    
    // ═══════════ TOKEN OPERATIONS ═══════════
    
    /**
     * Mint DRIP membership token (called during membership creation)
     */
    function _mintDripToken(address to) internal {
        // Associate token with account if needed
        _associateToken(to, dripToken);
        
        // Mint 1 DRIP token
        int64 responseCode = HederaTokenService.mintToken(dripToken, 1, new bytes[](0));
        require(responseCode == HederaResponseCodes.SUCCESS, "DRIP mint failed");
        
        // Transfer to member
        responseCode = HederaTokenService.transferToken(dripToken, address(this), to, 1);
        require(responseCode == HederaResponseCodes.SUCCESS, "DRIP transfer failed");
        
        // Freeze token (make non-transferable)
        responseCode = HederaTokenService.freezeToken(dripToken, to);
        require(responseCode == HederaResponseCodes.SUCCESS, "DRIP freeze failed");
    }
    
    /**
     * Burn DRIP token (called during redemption/AutoRelease)
     */
    function _burnDripToken(address from) internal {
        // Unfreeze temporarily
        int64 responseCode = HederaTokenService.unfreezeToken(dripToken, from);
        require(responseCode == HederaResponseCodes.SUCCESS, "DRIP unfreeze failed");
        
        // Transfer back to contract
        responseCode = HederaTokenService.transferToken(dripToken, from, address(this), 1);
        require(responseCode == HederaResponseCodes.SUCCESS, "DRIP transfer failed");
        
        // Burn token
        responseCode = HederaTokenService.burnToken(dripToken, 1, new int64[](0));
        require(responseCode == HederaResponseCodes.SUCCESS, "DRIP burn failed");
    }
    
    /**
     * Mint WISH reward tokens
     */
    function _mintWishTokens(address to, uint256 amount) internal {
        // Associate token with account if needed
        _associateToken(to, wishToken);
        
        // Mint WISH tokens
        int64 responseCode = HederaTokenService.mintToken(wishToken, int64(int256(amount)), new bytes[](0));
        require(responseCode == HederaResponseCodes.SUCCESS, "WISH mint failed");
        
        // Transfer to member
        responseCode = HederaTokenService.transferToken(wishToken, address(this), to, int64(int256(amount)));
        require(responseCode == HederaResponseCodes.SUCCESS, "WISH transfer failed");
    }
    
    /**
     * Associate token with account (if not already associated)
     */
    function _associateToken(address account, address token) internal {
        int64 responseCode = HederaTokenService.associateToken(account, token);
        // SUCCESS or TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT are both ok
        require(
            responseCode == HederaResponseCodes.SUCCESS || 
            responseCode == HederaResponseCodes.TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT,
            "Token association failed"
        );
    }
    
    // ═══════════ VIEW FUNCTIONS ═══════════
    
    /**
     * Get member information
     */
    function getMemberInfo(address member) 
        external 
        view 
        returns (
            uint256 dripTokens,
            uint256 wishClaimed,
            uint256 remainingWish,
            uint256 depositDate,
            bool isActive,
            bool capReached
        ) 
    {
        Member memory memberData = members[member];
        return (
            memberData.dripTokens,
            memberData.wishClaimed,
            memberData.remainingWish,
            memberData.depositDate,
            memberData.isActive,
            memberData.capReached
        );
    }
    
    /**
     * Get contract statistics
     */
    function getContractStats() 
        external 
        view 
        returns (
            uint256 _totalMembers,
            uint256 _totalWishClaimed,
            uint256 _totalMembersAtCap,
            uint256 _contractBalance,
            bool _isPaused
        ) 
    {
        return (
            totalMembers,
            totalWishClaimed,
            totalMembersAtCap,
            address(this).balance,
            paused
        );
    }
    
    /**
     * Check if address can create membership
     */
    function canCreateMembership(address account) external view returns (bool) {
        return !hasMembership[account] && !paused;
    }
    
    /**
     * Check if address can claim WISH
     */
    function canClaimWish(address account) external view returns (bool, uint256) {
        if (!hasMembership[account] || !members[account].isActive || members[account].capReached) {
            return (false, 0);
        }
        return (true, members[account].remainingWish);
    }
    
    /**
     * Check if address can redeem DRIP
     */
    function canRedeemDrip(address account) external view returns (bool) {
        return hasMembership[account] && 
               members[account].isActive && 
               members[account].capReached &&
               members[account].dripTokens > 0;
    }
    
    // ═══════════ ADMIN FUNCTIONS ═══════════
    
    /**
     * Set token addresses (called once after token creation)
     */
    function setTokenAddresses(address _dripToken, address _wishToken) 
        external 
        onlyOwner 
    {
        require(dripToken == address(0) && wishToken == address(0), "Tokens already set");
        require(_dripToken != address(0) && _wishToken != address(0), "Invalid token addresses");
        
        dripToken = _dripToken;
        wishToken = _wishToken;
    }
    
    /**
     * Update Treasury address
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        treasury = newTreasury;
    }
    
    /**
     * Pause/unpause contract
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    /**
     * Emergency withdraw (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner address");
        owner = newOwner;
    }
    
    // ═══════════ FALLBACK & RECEIVE ═══════════
    
    /**
     * Reject direct HBAR sends - users must call createMembership()
     */
    receive() external payable {
        revert("Use createMembership() function");
    }
    
    /**
     * Reject calls to non-existent functions
     */
    fallback() external payable {
        revert("Function not found - check contract ABI");
    }
}