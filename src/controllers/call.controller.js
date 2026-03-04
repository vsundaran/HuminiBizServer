const CallService = require('../services/CallService');

class CallController {
    /**
     * Initiate a call
     * @route POST /api/calls/initiate
     */
    async initiateCall(req, res, next) {
        try {
            const callerId = req.user.id;
            const organizationId = req.user.organizationId;
            const { receiverId, momentId } = req.body;
            
            const result = await CallService.initiateCall(callerId, receiverId, momentId, organizationId);
            
            res.status(201).json({
                success: true,
                message: 'Call initiated successfully',
                data: result,
                error: null
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update call state (accept, decline, end, fail)
     * @route PUT /api/calls/:id/status
     */
    async updateCallState(req, res, next) {
        try {
            const userId = req.user.id;
            const organizationId = req.user.organizationId;
            const { id } = req.params;
            const { status } = req.body;
            
            const result = await CallService.updateCallState(userId, organizationId, id, status);
            
            res.status(200).json({
                success: true,
                message: `Call marked as ${status}`,
                data: result,
                error: null
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user's call history
     * @route GET /api/calls
     */
    async getCallHistory(req, res, next) {
        try {
            const userId = req.user.id;
            const organizationId = req.user.organizationId;
            const limit = req.query.limit ? parseInt(req.query.limit) : 20;
            
            const history = await CallService.getCallHistory(userId, organizationId, limit);
            
            res.status(200).json({
                success: true,
                message: 'Call history fetched successfully',
                data: history,
                error: null
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CallController();
