const { Worker } = require('bullmq');
const { connection } = require('./queue');
const Call = require('../models/Call');
const { emitToOrg, emitToUser } = require('../sockets/socketManager');
const SOCKET_EVENTS = require('../sockets/events');

/**
 * Handle 30-second missed call timeouts reliably across multiple workers using BullMQ.
 * Enforces: "If a call is still ringing after 30s, mark it as missed and free both users."
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

                // Free both users in the org room via WebSocket
                const orgId = call.organizationId.toString();
                const freePayload = { organizationId: orgId, isInCall: false };

                emitToOrg(orgId, SOCKET_EVENTS.USER_CALL_STATUS_CHANGED, {
                    ...freePayload, userId: call.callerId.toString()
                });
                emitToOrg(orgId, SOCKET_EVENTS.USER_CALL_STATUS_CHANGED, {
                    ...freePayload, userId: call.receiverId.toString()
                });

                // Notify caller that the call was missed
                emitToUser(call.callerId.toString(), SOCKET_EVENTS.CALL_MISSED, {
                    callId: call._id.toString()
                });

            } else {
                console.log(`[BullMQ] Call Timeout: Call ${callId} is '${call.status}'. No action needed.`);
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
