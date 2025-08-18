/**
 * Enhanced HCS Topic Monitor that properly handles chunked messages
 * Uses Mirror Node API to reconstruct chunked protocol messages
 */

import https from 'https';
import { promises as fs } from 'fs';
import path from 'path';

class EnhancedHCSMonitor {
    constructor() {
        this.topicId = '0.0.6591043';
        this.outputDir = 'docs';
        this.mirrorNodeBase = 'https://testnet.mirrornode.hedera.com/api/v1';
        this.maxHistoryDays = 7;
    }

    async run() {
        console.log('🔍 Starting Enhanced HCS Topic Monitor...');
        console.log(`📡 Monitoring topic: ${this.topicId}`);
        
        try {
            await this.fetchAndProcessMessages();
            console.log('✅ Enhanced HCS monitoring completed successfully');
        } catch (error) {
            console.error('❌ Enhanced HCS monitoring failed:', error);
            throw error;
        }
    }

    async fetchAndProcessMessages() {
        console.log('📥 Fetching HCS messages from Mirror Node...');
        
        // Fetch recent messages with pagination to get all chunks
        const url = `${this.mirrorNodeBase}/topics/${this.topicId}/messages?limit=100&order=desc`;
        const messagesData = await this.makeHttpRequest(url);
        
        console.log(`📨 Retrieved ${messagesData.messages?.length || 0} messages`);
        
        // Group messages by transaction ID to reconstruct chunks
        const messageGroups = this.groupMessagesByTransaction(messagesData.messages || []);
        const reconstructedMessages = this.reconstructChunkedMessages(messageGroups);
        
        await this.processProtocolMessages(reconstructedMessages);
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
                // Non-chunked message
                groups.set(`single-${message.consensus_timestamp}`, [message]);
            }
        }
        
        console.log(`📝 Grouped ${messages.length} messages into ${groups.size} transactions`);
        return groups;
    }

    reconstructChunkedMessages(messageGroups) {
        const reconstructed = [];
        
        for (const [txKey, chunks] of messageGroups) {
            try {
                if (chunks.length === 1 && !chunks[0].chunk_info) {
                    // Single non-chunked message
                    reconstructed.push({
                        consensusTimestamp: chunks[0].consensus_timestamp,
                        content: Buffer.from(chunks[0].message, 'base64').toString('utf8')
                    });
                } else {
                    // Chunked message - sort by chunk number and reconstruct
                    chunks.sort((a, b) => a.chunk_info.number - b.chunk_info.number);
                    
                    let reconstructedContent = '';
                    for (const chunk of chunks) {
                        reconstructedContent += Buffer.from(chunk.message, 'base64').toString('utf8');
                    }
                    
                    reconstructed.push({
                        consensusTimestamp: chunks[0].consensus_timestamp, // Use first chunk timestamp
                        content: reconstructedContent
                    });
                    
                    console.log(`🔧 Reconstructed message from ${chunks.length} chunks`);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to reconstruct message for ${txKey}:`, error.message);
            }
        }
        
        // Sort by consensus timestamp (newest first)
        reconstructed.sort((a, b) => new Date(b.consensusTimestamp) - new Date(a.consensusTimestamp));
        
        console.log(`✅ Successfully reconstructed ${reconstructed.length} complete messages`);
        return reconstructed;
    }

    async processProtocolMessages(messages) {
        console.log('🔄 Processing reconstructed protocol messages...');
        
        const protocolSnapshots = [];
        const protocolEvents = [];
        
        for (const message of messages) {
            try {
                const parsedContent = JSON.parse(message.content);
                
                if (parsedContent.protocol === 'Fountain Protocol') {
                    if (parsedContent.type === 'daily_snapshot') {
                        protocolSnapshots.push({
                            consensusTimestamp: message.consensusTimestamp,
                            protocolData: parsedContent
                        });
                        console.log(`📊 Found daily snapshot: ${parsedContent.snapshotDate} with ${parsedContent.metrics?.totalDripHolders || 'unknown'} holders`);
                    } else if (parsedContent.event) {
                        protocolEvents.push({
                            consensusTimestamp: message.consensusTimestamp,
                            eventData: parsedContent
                        });
                        console.log(`📝 Found protocol event: ${parsedContent.event}`);
                    }
                }
            } catch (parseError) {
                // Skip non-JSON messages
            }
        }
        
        console.log(`📊 Found ${protocolSnapshots.length} protocol snapshots`);
        console.log(`📝 Found ${protocolEvents.length} protocol events`);
        
        // Use the most recent snapshot
        const latestSnapshot = protocolSnapshots[0]; // Already sorted newest first
        
        if (latestSnapshot) {
            console.log(`🎯 Latest snapshot: ${latestSnapshot.protocolData.snapshotDate}`);
            console.log(`   Members: ${latestSnapshot.protocolData.metrics?.totalDripHolders || 'unknown'}`);
            console.log(`   Donors: ${latestSnapshot.protocolData.metrics?.newDonorsToday || 0}`);
            console.log(`   Entitlement: ${latestSnapshot.protocolData.metrics?.finalEntitlement || 50} WISH`);
        }
        
        const protocolData = {
            lastUpdated: new Date().toISOString(),
            latestSnapshot: latestSnapshot?.protocolData || null,
            lastHCSMessage: messages[0]?.consensusTimestamp || null,
            totalMessages: messages.length,
            totalProtocolEvents: protocolEvents.length,
            topicId: this.topicId,
            source: latestSnapshot ? 'real-hcs-data-enhanced' : 'no-snapshots-found'
        };
        
        // Generate historical data from available snapshots
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);
        
        const recentSnapshots = protocolSnapshots.filter(s => 
            new Date(s.consensusTimestamp) >= cutoffDate
        );
        
        const historyData = {
            generatedAt: new Date().toISOString(),
            period: `${this.maxHistoryDays} days`,
            snapshots: recentSnapshots.map(s => s.protocolData),
            totalSnapshots: recentSnapshots.length,
            note: recentSnapshots.length > 0 ? 'Real historical data from HCS' : 'No recent snapshots found'
        };
        
        // Write data files
        await this.writeDataFiles(protocolData, historyData);
        
        // Generate summary
        this.generateActionsSummary(protocolData, historyData);
    }

    async writeDataFiles(protocolData, historyData) {
        try {
            // Ensure output directory exists
            await fs.mkdir(this.outputDir, { recursive: true });
            
            // Write current protocol data
            const protocolPath = path.join(this.outputDir, 'protocol-data.json');
            await fs.writeFile(protocolPath, JSON.stringify(protocolData, null, 2));
            console.log(`✅ Written protocol data to ${protocolPath}`);
            
            // Write historical data
            const historyPath = path.join(this.outputDir, 'protocol-history.json');
            await fs.writeFile(historyPath, JSON.stringify(historyData, null, 2));
            console.log(`✅ Written history data to ${historyPath}`);
            
            // Write metadata for GitHub Pages
            const metadata = {
                lastBuild: new Date().toISOString(),
                topicId: this.topicId,
                hasLatestSnapshot: !!protocolData.latestSnapshot,
                snapshotsFound: historyData.totalSnapshots,
                dataFiles: ['protocol-data.json', 'protocol-history.json'],
                enhancedProcessing: true
            };
            
            const metadataPath = path.join(this.outputDir, 'build-metadata.json');
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            console.log(`✅ Written metadata to ${metadataPath}`);
            
        } catch (error) {
            console.error('❌ Failed to write data files:', error);
            throw error;
        }
    }

    generateActionsSummary(protocolData, historyData) {
        const latestSnapshot = protocolData.latestSnapshot;
        
        console.log('\n📊 ENHANCED TESTNET PROTOCOL SUMMARY:');
        console.log(`   Data Source: ${protocolData.source}`);
        console.log(`   HCS Topic: ${protocolData.topicId}`);
        console.log(`   Total Messages Processed: ${protocolData.totalMessages}`);
        console.log(`   Protocol Events: ${protocolData.totalProtocolEvents || 0}`);
        
        if (latestSnapshot && latestSnapshot.metrics) {
            const metrics = latestSnapshot.metrics;
            console.log(`\n🎯 LATEST SNAPSHOT (${latestSnapshot.snapshotDate}):`);
            console.log(`   Type: ${latestSnapshot.type}`);
            console.log(`   Active Members: ${metrics.totalDripHolders || 0}`);
            console.log(`   Daily Entitlement: ${metrics.finalEntitlement || metrics.baseDailyRate || 0} WISH`);
            console.log(`   Growth Multiplier: ${metrics.growthMultiplier || 1.0}x`);
            console.log(`   New Donors: ${metrics.newDonorsToday || 0}`);
            console.log(`   Total WISH Allocated: ${metrics.totalWishToAllocate || 0}`);
            
            if (latestSnapshot.memberEntitlements) {
                const members = Object.keys(latestSnapshot.memberEntitlements);
                console.log(`   Individual Members: ${members.length}`);
                members.forEach(accountId => {
                    const member = latestSnapshot.memberEntitlements[accountId];
                    console.log(`     ${accountId}: ${member.dripBalance || 0} DRIP, ${member.totalEntitlement || 0} WISH/day (${member.memberType || 'Unknown'})`);
                });
            }
            
            console.log(`\n💰 TOKEN ADDRESSES:`);
            console.log(`     DRIP: ${latestSnapshot.tokenAddresses?.DRIP || 'N/A'}`);
            console.log(`     WISH: ${latestSnapshot.tokenAddresses?.WISH || 'N/A'}`);
            console.log(`     DROP: ${latestSnapshot.tokenAddresses?.DROP || 'N/A'}`);
        } else {
            console.log('⚠️ No protocol snapshots found');
        }
        
        console.log(`\n📈 Historical data: ${historyData.totalSnapshots} snapshots (${historyData.note || 'complete'})`);
        console.log(`🔗 Dashboard: https://opento-suggestions.github.io/hbar-fountain/`);
    }

    makeHttpRequest(url) {
        return new Promise((resolve, reject) => {
            console.log(`🌐 Fetching: ${url}`);
            
            const req = https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } catch (error) {
                        reject(new Error(`JSON parse error: ${error.message}`));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(new Error(`HTTP request error: ${error.message}`));
            });
            
            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('HTTP request timeout'));
            });
        });
    }
}

// Run the enhanced monitor
const monitor = new EnhancedHCSMonitor();
monitor.run();