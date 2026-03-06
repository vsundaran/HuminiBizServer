const Call = require('../models/Call');
const Moment = require('../models/Moment');
const User = require('../models/User');
const AgoraService = require('./AgoraService');
const CustomError = require('../utils/CustomError');
const { callQueue } = require('../jobs/queue');
const { emitToOrg, emitToUser } = require('../sockets/socketManager');
const SOCKET_EVENTS = require('../sockets/events');


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
        const [moment, callerUser] = await Promise.all([
            Moment.findOne({ _id: momentId, organizationId }).populate('categoryId').lean(),
            User.findById(callerId).select('name jobRole').lean(),
        ]);

        if (!moment) {
            throw new CustomError('Moment not found or unauthorized', 404);
        }

        // 2. You cannot call yourself
        if (callerId.toString() === receiverId.toString()) {
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
        });
        
        call.agoraChannelName = call._id.toString();
        await call.save();

        // 5. Generate Agora Token for the caller
        const tokenInfo = AgoraService.generateRtcToken(call.agoraChannelName, 0, 'publisher');

        // 6. Schedule Background Job for 30 second timeout using BullMQ
        await callQueue.add('handle-call-timeout', 
            { callId: call._id },
            { delay: 30000 }
        );

        // 7. Notify org room: both caller and receiver are now busy
        const busyPayload = { organizationId, isInCall: true };
        emitToOrg(organizationId.toString(), SOCKET_EVENTS.USER_CALL_STATUS_CHANGED, {
            ...busyPayload, userId: callerId.toString()
        });
        emitToOrg(organizationId.toString(), SOCKET_EVENTS.USER_CALL_STATUS_CHANGED, {
            ...busyPayload, userId: receiverId.toString()
        });

        // Extract category & subcategory names
        const categoryName = moment.categoryId?.name || '';
        const subcategories = moment.categoryId?.subcategories || [];
        const subcategory = subcategories.find(s => s._id.toString() === moment.subcategoryId.toString());
        const subcategoryName = subcategory ? subcategory.name : '';

        // 8. Notify receiver of incoming call via direct socket (enriched with caller info)
        emitToUser(receiverId.toString(), SOCKET_EVENTS.INCOMING_CALL, {
            callId: call._id.toString(),
            callerId: callerId.toString(),
            callerName: callerUser?.name || 'Unknown',
            callerRole: callerUser?.jobRole || '',
            momentId: momentId.toString(),
            categoryName,
            subcategoryName,
            momentDescription: moment.description || '',
            channelName: tokenInfo.channelName,
            agoraAppId: tokenInfo.appId,
        });

        return {
            call,
            token: tokenInfo.token,
            channelName: tokenInfo.channelName,
            agoraAppId: tokenInfo.appId,
            receiverId: receiverId.toString(),
        };
    }

    /**
     * Initiate a random call for "meet someone new"
     */
    async initiateRandomCall(callerId, organizationId) {
        const now = new Date();

        // 1. Check if caller is already busy
        const isCallerBusy = await this.isUserBusy(callerId);
        if (isCallerBusy) {
            throw new CustomError('You are already in an active call', 400);
        }

        // 2. Find all live moments in the organization not created by the caller
        const liveMoments = await Moment.find({
            organizationId,
            userId: { $ne: callerId },
            active: true,
            startDateTime: { $lte: now },
            endDateTime: { $gt: now }
        }).populate('categoryId').lean();

        if (!liveMoments || liveMoments.length === 0) {
            throw new CustomError('No users are currently available to meet', 404);
        }

        // 3. Shuffle moments to randomly select one
        const shuffledMoments = liveMoments.sort(() => 0.5 - Math.random());

        // 4. Find the first non-busy user to call
        let selectedMoment = null;
        for (const moment of shuffledMoments) {
            const isBusy = await this.isUserBusy(moment.userId);
            if (!isBusy) {
                selectedMoment = moment;
                break;
            }
        }

        if (!selectedMoment) {
            throw new CustomError('All available users are currently busy on other calls', 404);
        }

        const receiverId = selectedMoment.userId;

        // 5. Fetch caller info for the INCOMING_CALL payload
        const callerUser = await User.findById(callerId).select('name jobRole').lean();

        // 6. Create the Call record
        const call = new Call({
            callerId,
            receiverId,
            momentId: selectedMoment._id,
            organizationId,
            status: 'ringing',
            startedAt: new Date(),
        });
        
        call.agoraChannelName = call._id.toString();
        await call.save();

        // 7. Generate Agora Token for the caller
        const tokenInfo = AgoraService.generateRtcToken(call.agoraChannelName, 0, 'publisher');

        // 8. Schedule Background Job for 30 second timeout using BullMQ
        await callQueue.add('handle-call-timeout', 
            { callId: call._id },
            { delay: 30000 }
        );

        // 9. Notify org room: both caller and receiver are now busy
        const busyPayload = { organizationId, isInCall: true };
        emitToOrg(organizationId.toString(), SOCKET_EVENTS.USER_CALL_STATUS_CHANGED, {
            ...busyPayload, userId: callerId.toString()
        });
        emitToOrg(organizationId.toString(), SOCKET_EVENTS.USER_CALL_STATUS_CHANGED, {
            ...busyPayload, userId: receiverId.toString()
        });

        // Extract category & subcategory names
        const categoryName = selectedMoment.categoryId?.name || '';
        const subcategories = selectedMoment.categoryId?.subcategories || [];
        const subcategory = subcategories.find(s => s._id.toString() === selectedMoment.subcategoryId.toString());
        const subcategoryName = subcategory ? subcategory.name : '';

        // 10. Notify receiver of incoming call via direct socket (enriched with caller info)
        emitToUser(receiverId.toString(), SOCKET_EVENTS.INCOMING_CALL, {
            callId: call._id.toString(),
            callerId: callerId.toString(),
            callerName: callerUser?.name || 'Unknown',
            callerRole: callerUser?.jobRole || '',
            momentId: selectedMoment._id.toString(),
            categoryName,
            subcategoryName,
            momentDescription: selectedMoment.description || '',
            channelName: tokenInfo.channelName,
            agoraAppId: tokenInfo.appId,
        });

        return {
            call,
            token: tokenInfo.token,
            channelName: tokenInfo.channelName,
            agoraAppId: tokenInfo.appId,
            receiverId: receiverId.toString(),
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

        // If a user *accepts* the call, also generate a token for them to join
        let tokenInfo = null;
        if (newState === 'accepted') {
            tokenInfo = AgoraService.generateRtcToken(call.agoraChannelName, 0, 'publisher');

            // Notify caller that call was accepted (send token so they can start the stream)
            emitToUser(call.callerId.toString(), SOCKET_EVENTS.CALL_ACCEPTED, {
                callId: call._id.toString(),
                channelName: call.agoraChannelName,
                token: tokenInfo.token,
                agoraAppId: tokenInfo.appId,
            });
        }

        // When the call ends (any terminal state) → notify org that both users are free again
        const terminalStates = ['ended', 'declined', 'failed'];
        if (terminalStates.includes(newState)) {
            const freePayload = { organizationId: call.organizationId.toString(), isInCall: false };
            emitToOrg(call.organizationId.toString(), SOCKET_EVENTS.USER_CALL_STATUS_CHANGED, {
                ...freePayload, userId: call.callerId.toString()
            });
            emitToOrg(call.organizationId.toString(), SOCKET_EVENTS.USER_CALL_STATUS_CHANGED, {
                ...freePayload, userId: call.receiverId.toString()
            });

            // Notify the specific counterpart of the call ending/declining
            const counterpartId = userId.toString() === call.callerId.toString()
                ? call.receiverId.toString()
                : call.callerId.toString();

            if (newState === 'declined') {
                emitToUser(counterpartId, SOCKET_EVENTS.CALL_DECLINED, { callId: call._id.toString() });
            } else {
                emitToUser(counterpartId, SOCKET_EVENTS.CALL_ENDED, { callId: call._id.toString() });
            }
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

    /**
     * Handle user disconnection. If they are in an active call, end it.
     */
    async handleUserDisconnect(userId, organizationId) {
        try {
            const activeCall = await Call.findOne({
                organizationId,
                $or: [{ callerId: userId }, { receiverId: userId }],
                status: { $in: ['ringing', 'accepted', 'ongoing'] }
            });

            if (activeCall) {
                console.log(`[CallService] User ${userId} disconnected while in an active call. Ending call ${activeCall._id}`);
                
                activeCall.status = 'ended';
                activeCall.endedAt = new Date();
                await activeCall.save();

                const counterpartId = activeCall.callerId.toString() === userId.toString()
                    ? activeCall.receiverId.toString()
                    : activeCall.callerId.toString();

                emitToUser(counterpartId, SOCKET_EVENTS.CALL_ENDED, { callId: activeCall._id.toString() });

                const freePayload = { organizationId: activeCall.organizationId.toString(), isInCall: false };
                emitToOrg(activeCall.organizationId.toString(), SOCKET_EVENTS.USER_CALL_STATUS_CHANGED, {
                    ...freePayload, userId: activeCall.callerId.toString()
                });
                emitToOrg(activeCall.organizationId.toString(), SOCKET_EVENTS.USER_CALL_STATUS_CHANGED, {
                    ...freePayload, userId: activeCall.receiverId.toString()
                });
            }
        } catch (error) {
            console.error('[CallService] Error handling user disconnect:', error);
        }
    }
}

module.exports = new CallService();
