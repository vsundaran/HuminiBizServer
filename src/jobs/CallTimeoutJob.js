const { Worker } = require('bullmq');
const { connection } = require('./queue');
const Call = require('../models/Call');

/**
 * Handle 30-second missed call timeouts reliably across multiple workers using BullMQ.
 * This worker effectively enforces: "If a call is still ringing after 30s, mark it as missed and make user available."
 */
const callWorker = new Worker('call-queue', async (job) => {
    if (job.name === 'handle-call-timeout') {
        const { callId } = job.data;

        try {
            const call = await Call.findById(callId);
            
            if (!call) {
                console.warn(`[BullMQ] Call Timeout: Call ${callId} not found.`);
                return;
            }

            // Only enforce missed status if the call is still strictly in the 'ringing' state
            if (call.status === 'ringing') {
                call.status = 'missed';
                call.endedAt = new Date();
                await call.save();
                console.log(`[BullMQ] Call Timeout: Call ${callId} marked as missed.`);
            } else {
                console.log(`[BullMQ] Call Timeout: Call ${callId} status is already '${call.status}'. Doing nothing.`);
            }

        } catch (error) {
            console.error(`[BullMQ] Failed to process call timeout for ${callId}:`, error);
            throw error; // Let BullMQ handle retries if configured
        }
    }
}, { connection });

callWorker.on('completed', job => {
    console.log(`[BullMQ Worker] Job ${job.id} has completed!`);
});

callWorker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] Job ${job.id} has failed: ${err.message}`);
});

console.log('✅ BullMQ Call Worker started');

module.exports = callWorker;
