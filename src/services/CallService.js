const Call = require('../models/Call');
const Moment = require('../models/Moment');
const AgoraService = require('./AgoraService');
const CustomError = require('../utils/CustomError');
const { callQueue } = require('../jobs/queue');

class CallService {
    
    /**
     * Check if a user is currently busy in another call
     * Busy states: ringing, ongoing, accepted
     */
    async isUserBusy(userId) {
        const activeCall = await Call.findOne({
            $or: [{ callerId: userId }, { receiverId: userId }],
            status: { $in: ['ringing', 'accepted', 'ongoing'] }
        });
        return !!activeCall;
    }

    /**
     * Initiate a new video call
     */
    async initiateCall(callerId, receiverId, momentId, organizationId) {
        // 1. Validate moment exists and is in the same organization
        const moment = await Moment.findOne({ _id: momentId, organizationId });
        if (!moment) {
            throw new CustomError('Moment not found or unauthorized', 404);
        }

        // 2. You cannot call yourself
        if (callerId === receiverId) {
            throw new CustomError('Cannot initiate a call to yourself', 400);
        }

        // 3. Ensure neither caller nor receiver are currently busy
        const [isCallerBusy, isReceiverBusy] = await Promise.all([
            this.isUserBusy(callerId),
            this.isUserBusy(receiverId)
        ]);

        if (isCallerBusy) throw new CustomError('You are already in an active call', 400);
        if (isReceiverBusy) throw new CustomError('The user is currently busy in another call', 400);

        // 4. Create the Call record
        const call = new Call({
            callerId,
            receiverId,
            momentId,
            organizationId,
            status: 'ringing',
            startedAt: new Date(),
            // Using the new call's ID as the unique Agora channel name
        });
        
        call.agoraChannelName = call._id.toString();
        await call.save();

        // 5. Generate Agora Token for the caller
        const tokenInfo = AgoraService.generateRtcToken(call.agoraChannelName, 0, 'publisher');

        // 6. Schedule Background Job for 30 second timeout using BullMQ
        await callQueue.add('handle-call-timeout', 
            { callId: call._id },
            { delay: 30000 } // delay in milliseconds
        );

        return {
            call,
            token: tokenInfo.token,
            channelName: tokenInfo.channelName,
            agoraAppId: tokenInfo.appId
        };
    }

    /**
     * Answer, Decline, or End a call securely mapped to the user and organization
     */
    async updateCallState(userId, organizationId, callId, newState) {
        const allowedUpdates = ['accepted', 'declined', 'ended', 'failed'];
        if (!allowedUpdates.includes(newState)) {
            throw new CustomError('Invalid call state update', 400);
        }

        const call = await Call.findOne({
            _id: callId,
            organizationId,
            $or: [{ callerId: userId }, { receiverId: userId }]
        });

        if (!call) {
            throw new CustomError('Call not found or unauthorized', 404);
        }

        // State Machine logic to prevent illogical jumps
        if (call.status === 'ended' || call.status === 'missed' || call.status === 'declined') {
            throw new CustomError(`Call is already ${call.status}`, 400);
        }

        // Apply new state
        call.status = newState;
        
        if (newState === 'ended' || newState === 'declined' || newState === 'failed') {
            call.endedAt = new Date();
        }

        await call.save();

        // If a user *accepts* the call, we also generate a token for them to join
        let tokenInfo = null;
        if (newState === 'accepted') {
            // Also update to 'ongoing' depending on client standard, or keep 'accepted'
            tokenInfo = AgoraService.generateRtcToken(call.agoraChannelName, 0, 'publisher');
        }

        return {
            call,
            token: tokenInfo ? tokenInfo.token : null,
            channelName: call.agoraChannelName,
            agoraAppId: tokenInfo ? tokenInfo.appId : null
        };
    }

    /**
     * Get user's call history within the organization
     */
    async getCallHistory(userId, organizationId, limit = 20) {
        const calls = await Call.find({
            organizationId,
            $or: [{ callerId: userId }, { receiverId: userId }]
        })
        .populate('callerId', 'name jobRole')
        .populate('receiverId', 'name jobRole')
        .populate('momentId', 'description')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

        return calls;
    }
}

module.exports = new CallService();
