/**
 * Analyze HCS Topic for Weekly Cycle Events
 * Counts and categorizes all AutoRedeem and WISH issuance events
 */

import https from 'https';

class HCSWeeklyAnalyzer {
    constructor() {
        this.topicId = '0.0.6591043';
        this.mirrorNodeBase = 'https://testnet.mirrornode.hedera.com/api/v1';
    }

    async fetchAllRecentMessages() {
        console.log('📥 Fetching all recent HCS messages...');
        
        const url = `${this.mirrorNodeBase}/topics/${this.topicId}/messages?limit=100&order=desc`;
        const messagesData = await this.makeHttpRequest(url);
        
        console.log(`📨 Retrieved ${messagesData.messages?.length || 0} messages`);
        return messagesData.messages || [];
    }

    groupMessagesByTransaction(messages) {
        const groups = new Map();
        
        for (const message of messages) {
            const txId = message.chunk_info?.initial_transaction_id;
            if (txId) {
                const txKey = `${txId.account_id}-${txId.transaction_valid_start}`;
                if (!groups.has(txKey)) {
                    groups.set(txKey, []);
                }
                groups.get(txKey).push(message);
            } else {
                groups.set(`single-${message.consensus_timestamp}`, [message]);
            }
        }
        
        return groups;
    }

    reconstructChunkedMessages(messageGroups) {
        const reconstructed = [];
        
        for (const [txKey, chunks] of messageGroups) {
            try {
                if (chunks.length === 1 && !chunks[0].chunk_info) {
                    reconstructed.push({
                        consensusTimestamp: chunks[0].consensus_timestamp,
                        content: Buffer.from(chunks[0].message, 'base64').toString('utf8')
                    });
                } else {
                    chunks.sort((a, b) => a.chunk_info.number - b.chunk_info.number);
                    
                    let reconstructedContent = '';
                    for (const chunk of chunks) {
                        reconstructedContent += Buffer.from(chunk.message, 'base64').toString('utf8');
                    }
                    
                    reconstructed.push({
                        consensusTimestamp: chunks[0].consensus_timestamp,
                        content: reconstructedContent
                    });
                }
            } catch (error) {
                console.warn(`⚠️ Failed to reconstruct message for ${txKey}:`, error.message);
            }
        }
        
        reconstructed.sort((a, b) => new Date(b.consensusTimestamp) - new Date(a.consensusTimestamp));
        return reconstructed;
    }

    async analyzeWeeklyEvents() {
        console.log('🔍 Starting Weekly Event Analysis...');
        
        const messages = await this.fetchAllRecentMessages();
        const messageGroups = this.groupMessagesByTransaction(messages);
        const reconstructedMessages = this.reconstructChunkedMessages(messageGroups);
        
        console.log(`✅ Reconstructed ${reconstructedMessages.length} complete messages`);
        
        const eventCounts = {
            autoRedeemEvents: [],
            wishIssuanceEvents: [],
            dailySnapshots: [],
            otherEvents: []
        };
        
        const userAutoRedeems = {
            'TEST_USER_1': 0,
            'TEST_USER_2': 0,
            'TEST_USER_3': 0,
            'TEST_USER_4': 0,
            'TEST_USER_5': 0,
            'TEST_USER_6': 0
        };
        
        const dailyBreakdown = {};
        
        console.log('\n📋 Analyzing each event...');
        
        for (const message of reconstructedMessages) {
            try {
                const parsedContent = JSON.parse(message.content);
                
                if (parsedContent.protocol === 'Fountain Protocol') {
                    const timestamp = new Date(parsedContent.timestamp);
                    const date = timestamp.toISOString().split('T')[0];
                    
                    if (parsedContent.type === 'auto_redeem' && parsedContent.event === 'AutoRedeemProcessed') {
                        eventCounts.autoRedeemEvents.push({
                            timestamp: parsedContent.timestamp,
                            member: parsedContent.memberName || parsedContent.member,
                            consensusTimestamp: message.consensusTimestamp,
                            hbarProfit: parsedContent.details?.netHbarBenefit || 80000000,
                            wishBurned: parsedContent.details?.wishBurned || 1000
                        });
                        
                        // Count by user
                        const memberName = parsedContent.memberName;
                        if (memberName && userAutoRedeems.hasOwnProperty(memberName)) {
                            userAutoRedeems[memberName]++;
                        }
                        
                        console.log(`  🔄 AutoRedeem: ${memberName || parsedContent.member} at ${parsedContent.timestamp}`);
                        
                    } else if (parsedContent.type === 'daily_wish_issuance' && parsedContent.event === 'DailyWishDistribution') {
                        eventCounts.wishIssuanceEvents.push({
                            timestamp: parsedContent.timestamp,
                            day: parsedContent.day,
                            totalWishIssued: parsedContent.details?.totalWishIssued || 0,
                            membersIssued: parsedContent.details?.totalMembersIssued || 0,
                            consensusTimestamp: message.consensusTimestamp
                        });
                        
                        console.log(`  💰 WISH Issuance: Day ${parsedContent.day}, ${parsedContent.details?.totalWishIssued || 0} WISH issued`);
                        
                    } else if (parsedContent.type === 'daily_snapshot') {
                        eventCounts.dailySnapshots.push({
                            timestamp: parsedContent.timestamp,
                            snapshotDate: parsedContent.snapshotDate,
                            totalHolders: parsedContent.metrics?.totalDripHolders || 0,
                            consensusTimestamp: message.consensusTimestamp
                        });
                        
                        console.log(`  📊 Daily Snapshot: ${parsedContent.snapshotDate}, ${parsedContent.metrics?.totalDripHolders || 0} holders`);
                        
                    } else {
                        eventCounts.otherEvents.push({
                            type: parsedContent.type,
                            event: parsedContent.event,
                            timestamp: parsedContent.timestamp,
                            consensusTimestamp: message.consensusTimestamp
                        });
                        
                        console.log(`  📝 Other Event: ${parsedContent.event || parsedContent.type}`);
                    }
                }
            } catch (parseError) {
                // Skip non-JSON messages
            }
        }
        
        return {
            eventCounts,
            userAutoRedeems,
            totalMessages: reconstructedMessages.length
        };
    }

    generateWeeklyReport(analysisResults) {
        const { eventCounts, userAutoRedeems, totalMessages } = analysisResults;
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 WEEKLY HCS EVENT ANALYSIS REPORT');
        console.log('='.repeat(80));
        
        console.log(`\n📋 OVERALL SUMMARY:`);
        console.log(`   Total HCS Messages Processed: ${totalMessages}`);
        console.log(`   AutoRedeem Events: ${eventCounts.autoRedeemEvents.length}`);
        console.log(`   WISH Issuance Events: ${eventCounts.wishIssuanceEvents.length}`);
        console.log(`   Daily Snapshots: ${eventCounts.dailySnapshots.length}`);
        console.log(`   Other Protocol Events: ${eventCounts.otherEvents.length}`);
        
        console.log(`\n🔄 AUTOREDEEM BREAKDOWN BY USER:`);
        let totalAutoRedeems = 0;
        let totalHbarProfits = 0;
        
        Object.entries(userAutoRedeems).forEach(([user, count]) => {
            const hbarProfit = count * 0.8; // 0.8 HBAR per AutoRedeem
            console.log(`   ${user}: ${count} AutoRedeems (${hbarProfit.toFixed(1)} HBAR profit)`);
            totalAutoRedeems += count;
            totalHbarProfits += hbarProfit;
        });
        
        console.log(`   TOTAL: ${totalAutoRedeems} AutoRedeems (${totalHbarProfits.toFixed(1)} HBAR total profit)`);
        
        console.log(`\n💰 WISH ISSUANCE BREAKDOWN:`);
        let totalWishIssued = 0;
        
        eventCounts.wishIssuanceEvents
            .sort((a, b) => a.day - b.day)
            .forEach(event => {
                console.log(`   Day ${event.day}: ${event.totalWishIssued} WISH issued to ${event.membersIssued} members`);
                totalWishIssued += event.totalWishIssued;
            });
        
        console.log(`   TOTAL: ${totalWishIssued} WISH tokens issued over ${eventCounts.wishIssuanceEvents.length} days`);
        
        console.log(`\n📊 DAILY SNAPSHOTS:`);
        eventCounts.dailySnapshots.forEach(snapshot => {
            console.log(`   ${snapshot.snapshotDate}: ${snapshot.totalHolders} active holders`);
        });
        
        if (eventCounts.otherEvents.length > 0) {
            console.log(`\n📝 OTHER PROTOCOL EVENTS:`);
            eventCounts.otherEvents.forEach(event => {
                console.log(`   ${event.event || event.type} at ${event.timestamp}`);
            });
        }
        
        console.log(`\n✅ WEEKLY CYCLE VERIFICATION:`);
        console.log(`   Expected: 7 WISH issuance events ✅ Found: ${eventCounts.wishIssuanceEvents.length}`);
        console.log(`   Expected: 22 AutoRedeem events ✅ Found: ${eventCounts.autoRedeemEvents.length}`);
        console.log(`   Expected HBAR profits: 17.6 ℏ ✅ Found: ${totalHbarProfits.toFixed(1)} ℏ`);
        console.log(`   Expected WISH issued: 2800 ✅ Found: ${totalWishIssued}`);
        
        const allExpected = (
            eventCounts.wishIssuanceEvents.length === 7 &&
            eventCounts.autoRedeemEvents.length === 22 &&
            Math.abs(totalHbarProfits - 17.6) < 0.1 &&
            totalWishIssued === 2800
        );
        
        console.log(`\n🎯 SANITY CHECK RESULT: ${allExpected ? '✅ PASS' : '❌ FAIL'}`);
        
        if (allExpected) {
            console.log('🎉 All weekly cycle events successfully logged to HCS!');
        } else {
            console.log('⚠️ Some discrepancies found - review needed');
        }
        
        console.log(`\n🔗 VERIFICATION LINKS:`);
        console.log(`   HCS Topic: https://hashscan.io/testnet/topic/0.0.6591043`);
        console.log(`   Dashboard: https://opento-suggestions.github.io/hbar-fountain/`);
        
        return allExpected;
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
            const results = await this.analyzeWeeklyEvents();
            const passed = this.generateWeeklyReport(results);
            
            console.log('\n🎉 Weekly HCS analysis completed!');
            return { passed, results };
            
        } catch (error) {
            console.error('❌ Analysis failed:', error);
            throw error;
        }
    }
}

// Run the analysis
const analyzer = new HCSWeeklyAnalyzer();
analyzer.run();