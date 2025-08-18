/**
 * Verify ONLY the Weekly Cycle Events
 * Focuses on events from the 7-day cycle we just completed
 */

import https from 'https';

class WeeklyCycleVerifier {
    constructor() {
        this.topicId = '0.0.6591043';
        this.mirrorNodeBase = 'https://testnet.mirrornode.hedera.com/api/v1';
        
        // Time range for our weekly cycle (approximately)
        this.cycleStartTime = new Date('2025-08-18T05:35:00Z'); // Around when we started
        this.cycleEndTime = new Date('2025-08-18T05:40:00Z');   // Around when we finished
    }

    async fetchAndAnalyzeWeeklyCycle() {
        console.log('🔍 Analyzing ONLY Weekly Cycle Events...');
        console.log(`📅 Time Range: ${this.cycleStartTime.toISOString()} to ${this.cycleEndTime.toISOString()}`);
        
        const url = `${this.mirrorNodeBase}/topics/${this.topicId}/messages?limit=100&order=desc`;
        const messagesData = await this.makeHttpRequest(url);
        
        console.log(`📨 Retrieved ${messagesData.messages?.length || 0} total messages`);
        
        // Reconstruct messages (simplified for this check)
        const protocolEvents = [];
        
        for (const message of messagesData.messages || []) {
            try {
                const content = Buffer.from(message.message, 'base64').toString('utf8');
                const parsedContent = JSON.parse(content);
                
                if (parsedContent.protocol === 'Fountain Protocol') {
                    const eventTime = new Date(parsedContent.timestamp);
                    
                    // Only include events from our weekly cycle timeframe
                    if (eventTime >= this.cycleStartTime && eventTime <= this.cycleEndTime) {
                        protocolEvents.push({
                            type: parsedContent.type,
                            event: parsedContent.event,
                            timestamp: parsedContent.timestamp,
                            memberName: parsedContent.memberName,
                            day: parsedContent.day,
                            totalWishIssued: parsedContent.details?.totalWishIssued,
                            consensusTimestamp: message.consensus_timestamp
                        });
                    }
                }
            } catch (parseError) {
                // Skip non-JSON or partial messages
            }
        }
        
        // Sort by timestamp
        protocolEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        console.log(`\n✅ Found ${protocolEvents.length} events from weekly cycle timeframe`);
        
        // Categorize events
        const weeklyAutoRedeems = protocolEvents.filter(e => 
            e.type === 'auto_redeem' && e.event === 'AutoRedeemProcessed'
        );
        
        const weeklyWishIssuances = protocolEvents.filter(e => 
            e.type === 'daily_wish_issuance' && e.event === 'DailyWishDistribution'
        );
        
        // Count by user
        const userCounts = {
            'TEST_USER_1': 0,
            'TEST_USER_2': 0,
            'TEST_USER_3': 0,
            'TEST_USER_4': 0,
            'TEST_USER_5': 0,
            'TEST_USER_6': 0
        };
        
        weeklyAutoRedeems.forEach(event => {
            if (event.memberName && userCounts.hasOwnProperty(event.memberName)) {
                userCounts[event.memberName]++;
            }
        });
        
        // Calculate totals
        const totalAutoRedeems = weeklyAutoRedeems.length;
        const totalWishIssued = weeklyWishIssuances.reduce((sum, e) => sum + (e.totalWishIssued || 0), 0);
        const totalHbarProfits = totalAutoRedeems * 0.8;
        
        console.log('\n' + '='.repeat(70));
        console.log('📊 WEEKLY CYCLE VERIFICATION (TIMEFRAME-FILTERED)');
        console.log('='.repeat(70));
        
        console.log(`\n🔄 AUTOREDEEM EVENTS (${totalAutoRedeems} total):`);
        Object.entries(userCounts).forEach(([user, count]) => {
            if (count > 0) {
                console.log(`   ${user}: ${count} AutoRedeems (${(count * 0.8).toFixed(1)} HBAR profit)`);
            }
        });
        
        console.log(`\n💰 WISH ISSUANCE EVENTS (${weeklyWishIssuances.length} total):`);
        weeklyWishIssuances.forEach(event => {
            console.log(`   Day ${event.day}: ${event.totalWishIssued} WISH issued`);
        });
        
        console.log(`\n📋 WEEKLY CYCLE SUMMARY:`);
        console.log(`   Days with WISH issuance: ${weeklyWishIssuances.length}`);
        console.log(`   Total AutoRedeems: ${totalAutoRedeems}`);
        console.log(`   Total WISH issued: ${totalWishIssued}`);
        console.log(`   Total HBAR profits: ${totalHbarProfits.toFixed(1)} ℏ`);
        
        console.log(`\n✅ VERIFICATION AGAINST EXPECTED:`);
        const results = {
            days: weeklyWishIssuances.length === 7,
            autoRedeems: totalAutoRedeems === 22,
            wishIssued: totalWishIssued === 2800,
            hbarProfits: Math.abs(totalHbarProfits - 17.6) < 0.1
        };
        
        console.log(`   Expected 7 days: ${results.days ? '✅ PASS' : '❌ FAIL'} (Found: ${weeklyWishIssuances.length})`);
        console.log(`   Expected 22 AutoRedeems: ${results.autoRedeems ? '✅ PASS' : '❌ FAIL'} (Found: ${totalAutoRedeems})`);
        console.log(`   Expected 2800 WISH: ${results.wishIssued ? '✅ PASS' : '❌ FAIL'} (Found: ${totalWishIssued})`);
        console.log(`   Expected 17.6 HBAR: ${results.hbarProfits ? '✅ PASS' : '❌ FAIL'} (Found: ${totalHbarProfits.toFixed(1)})`);
        
        const allPassed = Object.values(results).every(r => r === true);
        
        console.log(`\n🎯 FINAL RESULT: ${allPassed ? '✅ WEEKLY CYCLE FULLY VERIFIED' : '❌ DISCREPANCIES FOUND'}`);
        
        if (allPassed) {
            console.log('🎉 Perfect! All 7 days of WISH issuance and 22 AutoRedeems logged to HCS!');
        }
        
        return { allPassed, results, protocolEvents };
    }

    makeHttpRequest(url) {
        return new Promise((resolve, reject) => {
            const req = https.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error(`JSON parse error: ${error.message}`));
                    }
                });
            });
            req.on('error', reject);
            req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
        });
    }

    async run() {
        try {
            return await this.fetchAndAnalyzeWeeklyCycle();
        } catch (error) {
            console.error('❌ Verification failed:', error);
            throw error;
        }
    }
}

// Run the verification
const verifier = new WeeklyCycleVerifier();
verifier.run();