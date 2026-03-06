const MomentService = require('../services/MomentService');

class MomentController {

    async createMoment(req, res, next) {
        try {
            const userId = req.user.id;
            const organizationId = req.user.organizationId;
            const moment = await MomentService.createMoment(userId, organizationId, req.body);
            res.status(201).json({ success: true, message: 'Moment created successfully', data: moment, error: null });
        } catch (error) { next(error); }
    }

    async getMyMoments(req, res, next) {
        try {
            const userId = req.user.id;
            const organizationId = req.user.organizationId;
            const moments = await MomentService.getMyMoments(userId, organizationId);
            res.status(200).json({ success: true, message: 'My moments fetched', data: moments, error: null });
        } catch (error) { next(error); }
    }

    async toggleMomentStatus(req, res, next) {
        try {
            const userId = req.user.id;
            const organizationId = req.user.organizationId;
            const { id } = req.params;
            const { active } = req.body;
            
            const moment = await MomentService.toggleMomentStatus(userId, organizationId, id, active);
            res.status(200).json({ success: true, message: 'Moment status updated', data: moment, error: null });
        } catch (error) { next(error); }
    }

    async archiveMoment(req, res, next) {
        try {
            const userId = req.user.id;
            const organizationId = req.user.organizationId;
            const { id } = req.params;
            const moment = await MomentService.archiveMoment(userId, organizationId, id);
            res.status(200).json({ success: true, message: 'Moment archived', data: moment, error: null });
        } catch (error) { next(error); }
    }
    
    async toggleLikeMoment(req, res, next) {
        try {
            const userId = req.user.id;
            const organizationId = req.user.organizationId;
            const { id } = req.params;
            const result = await MomentService.toggleLikeMoment(userId, organizationId, id);
            res.status(200).json({ success: true, message: 'Moment like toggled', data: result, error: null });
        } catch (error) { next(error); }
    }

    async getLiveMoments(req, res, next) {
        try {
            const userId = req.user.id;
            const organizationId = req.user.organizationId;
            const limit = req.query.limit ? parseInt(req.query.limit) : null;
            const categoryId = req.query.categoryId || null;
            const moments = await MomentService.getMomentsFeed(userId, organizationId, 'live', limit, categoryId);
            res.status(200).json({ success: true, message: 'Live moments fetched', data: moments, error: null });
        } catch (error) { next(error); }
    }
    
    async getUpcomingMoments(req, res, next) {
        try {
            const userId = req.user.id;
            const organizationId = req.user.organizationId;
            const limit = req.query.limit ? parseInt(req.query.limit) : null;
            const categoryId = req.query.categoryId || null;
            const moments = await MomentService.getMomentsFeed(userId, organizationId, 'upcoming', limit, categoryId);
            res.status(200).json({ success: true, message: 'Upcoming moments fetched', data: moments, error: null });
        } catch (error) { next(error); }
    }
    
    async getLaterMoments(req, res, next) {
        try {
            const userId = req.user.id;
            const organizationId = req.user.organizationId;
            const limit = req.query.limit ? parseInt(req.query.limit) : null;
            const categoryId = req.query.categoryId || null;
            const moments = await MomentService.getMomentsFeed(userId, organizationId, 'later', limit, categoryId);
            res.status(200).json({ success: true, message: 'Later moments fetched', data: moments, error: null });
        } catch (error) { next(error); }
    }

}

module.exports = new MomentController();
