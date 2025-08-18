// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * Fountain Protocol Production Smart Contract
 * Direct blockchain interaction - no web app or server needed
 * Users interact directly with contract using their wallets
 * 
 * Contract Features:
 * - createMembership(): Send 1 HBAR to create membership
 * - claimWish(): Claim reward tokens (up to 1000 cap)
 * - redeemDrip(): Redeem membership for HBAR refund
 * - AutoRelease: Automatic refund when 1000 cap reached
 */

contract FountainProtocol {
    
    // ═══════════ STATE VARIABLES ═══════════
    
    address public treasury;
    address public owner;
    
    // Protocol parameters
    uint256 public constant MEMBERSHIP_DEPOSIT = 1 ether; // 1 HBAR
    uint256 public constant MAX_WISH_PER_DRIP = 1000;
    uint256 public constant MEMBER_REFUND_RATE = 80; // 80% (0.8 HBAR)
    uint256 public constant TREASURY_FEE_RATE = 20;  // 20% (0.2 HBAR)
    uint256 public constant TREASURY_BONUS = 1 ether; // 1 HBAR bonus from Treasury
    uint256 public constant TOTAL_MEMBER_PAYOUT = 18 * 10**17; // 1.8 HBAR total
    
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
    
    event MembershipCreated(
        address indexed member,
        uint256 indexed dripTokens,
        uint256 indexed maxWishQuota,
        uint256 depositAmount,
        uint256 timestamp
    );
    
    event WishClaimed(
        address indexed member,
        uint256 indexed amount,
        uint256 indexed totalClaimed,
        uint256 remainingQuota,
        bool capReached
    );
    
    event DripRedeemed(
        address indexed member,
        uint256 indexed refundAmount,
        uint256 indexed treasuryFee,
        uint256 totalWishClaimed,
        uint256 timestamp
    );
    
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
     * No web app needed - users call this directly from wallet
     */
    function createMembership() 
        external 
        payable 
        notPaused
        validDeposit
        newMember
    {
        // Create member record (simplified - no actual token minting for demo)
        members[msg.sender] = Member({
            dripTokens: 1,
            wishClaimed: 0,
            remainingWish: MAX_WISH_PER_DRIP,
            depositDate: block.timestamp,
            isActive: true,
            capReached: false
        });
        
        hasMembership[msg.sender] = true;
        totalMembers++;
        
        emit MembershipCreated(
            msg.sender,
            1,
            MAX_WISH_PER_DRIP,
            MEMBERSHIP_DEPOSIT,
            block.timestamp
        );
    }
    
    /**
     * Claim WISH reward tokens (up to 1000 lifetime cap)
     * No web app needed - users call this directly from wallet
     */
    function claimWish(uint256 amount) 
        external 
        notPaused
        activeMember
    {
        require(amount > 0 && amount <= 500, "Claim 1-500 WISH per transaction");
        
        Member storage memberData = members[msg.sender];
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
            _triggerAutoRelease(msg.sender);
        } else {
            // Regular WISH claim (simplified - no actual token minting)
            emit WishClaimed(
                msg.sender,
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
        Member storage memberData = members[msg.sender];
        require(memberData.capReached, "Must reach 1000 WISH cap before redemption");
        require(memberData.dripTokens > 0, "No DRIP tokens to redeem");
        
        // Calculate payments: 0.8 HBAR refund + 1.0 HBAR Treasury bonus = 1.8 HBAR total
        uint256 refundAmount = (MEMBERSHIP_DEPOSIT * MEMBER_REFUND_RATE) / 100;
        uint256 treasuryFee = (MEMBERSHIP_DEPOSIT * TREASURY_FEE_RATE) / 100;
        uint256 totalPayout = TOTAL_MEMBER_PAYOUT; // 1.8 HBAR total to member
        
        require(address(this).balance >= totalPayout, "Insufficient contract balance");
        
        // Update member status
        memberData.dripTokens = 0;
        memberData.isActive = false;
        
        // Transfer total payout to member (1.8 HBAR)
        payable(msg.sender).transfer(totalPayout);
        
        // Treasury fee stays in contract (already collected from deposit)
        
        emit DripRedeemed(
            msg.sender,
            totalPayout,
            treasuryFee,
            memberData.wishClaimed,
            block.timestamp
        );
    }
    
    // ═══════════ AUTO-RELEASE MECHANISM ═══════════
    
    /**
     * Trigger AutoRelease when member reaches 1000 WISH cap
     * Automatically refunds 0.8 HBAR
     */
    function _triggerAutoRelease(address member) internal {
        Member storage memberData = members[member];
        
        // Calculate total payout: 0.8 HBAR refund + 1.0 HBAR Treasury bonus = 1.8 HBAR
        uint256 refundAmount = (MEMBERSHIP_DEPOSIT * MEMBER_REFUND_RATE) / 100;
        uint256 treasuryFee = (MEMBERSHIP_DEPOSIT * TREASURY_FEE_RATE) / 100;
        uint256 totalPayout = TOTAL_MEMBER_PAYOUT; // 1.8 HBAR total to member
        
        require(address(this).balance >= totalPayout, "Insufficient balance for AutoRelease");
        
        // Update member status
        memberData.dripTokens = 0;
        memberData.isActive = false;
        memberData.remainingWish = 0;
        
        // Transfer total payout to member (1.8 HBAR)
        payable(member).transfer(totalPayout);
        
        emit AutoReleaseTriggered(
            member,
            totalPayout,
            MAX_WISH_PER_DRIP,
            block.timestamp
        );
        
        emit WishClaimed(
            member,
            memberData.remainingWish,
            MAX_WISH_PER_DRIP,
            0,
            true
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