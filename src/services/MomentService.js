const Moment = require('../models/Moment');
const MomentLike = require('../models/MomentLike');
const Call = require('../models/Call');
const CustomError = require('../utils/CustomError');


class MomentService {

    /**
     * Create a new moment
     */
    async createMoment(userId, organizationId, createData) {
        const moment = new Moment({
            userId,
            organizationId,
            ...createData,
            active: true,
            likeCount: 0
        });
        await moment.save();
        return moment;
    }

    /**
     * Get moments created by the logged-in user (split by active vs expired)
     */
    async getMyMoments(userId, organizationId) {
        const now = new Date();

        const myMoments = await Moment.find({ userId, organizationId })
            .populate('categoryId', 'name subcategories')
            .sort({ createdAt: -1 })
            .lean();

        const mappedMoments = myMoments.map(moment => {
            let subcatName = null;
            if (moment.categoryId && moment.categoryId.subcategories) {
                const subcat = moment.categoryId.subcategories.find(
                    s => s._id.toString() === moment.subcategoryId.toString()
                );
                if (subcat) {
                    subcatName = subcat.name;
                }
                // Only send back the category name to avoid large payloads
                moment.categoryId = { _id: moment.categoryId._id, name: moment.categoryId.name };
            }
            return {
                ...moment,
                subcategoryName: subcatName
            };
        });

        const activeMoments = [];
        const expiredMoments = [];

        mappedMoments.forEach(moment => {
            if (moment.active && moment.endDateTime > now) {
                activeMoments.push(moment);
            } else {
                expiredMoments.push(moment);
            }
        });

        return { activeMoments, expiredMoments };
    }

    /**
     * Set a moment's status to active or inactive
     */
    async toggleMomentStatus(userId, organizationId, momentId, activeStatus) {
        const moment = await Moment.findOne({ _id: momentId, userId, organizationId });
        if (!moment) {
            throw new CustomError('Moment not found or unauthorized', 404);
        }

        moment.active = activeStatus;
        await moment.save();
        return moment;
    }

    /**
     * Like or unlike a moment
     */
    async toggleLikeMoment(userId, organizationId, momentId) {
        const moment = await Moment.findOne({ _id: momentId, organizationId });
        if (!moment) {
            throw new CustomError('Moment not found', 404);
        }

        const existingLike = await MomentLike.findOne({ userId, momentId, organizationId });

        if (existingLike) {
            // Unlike
            await MomentLike.deleteOne({ _id: existingLike._id });
            moment.likeCount = Math.max(0, moment.likeCount - 1);
            await moment.save();
            return { liked: false, likeCount: moment.likeCount };
        } else {
            // Like
            await MomentLike.create({ userId, momentId, organizationId });
            moment.likeCount += 1;
            await moment.save();
            return { liked: true, likeCount: moment.likeCount };
        }
    }

    /**
     * Fetch all available moments for the home feed based on timing logic
     * type: 'live' | 'upcoming' | 'later'
     * limit: number of moments to return, or null for all (with optional category filter)
     */
    async getMomentsFeed(userId, organizationId, type, limit, categoryId = null) {
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        let dateFilter = {};
        
        switch (type) {
            case 'live':
                // live moments: valid start time has passed, end time has not passed
                dateFilter = {
                    startDateTime: { $lte: now },
                    endDateTime: { $gt: now }
                };
                break;
            case 'upcoming':
                // going to available in the next 2 hours
                dateFilter = {
                    startDateTime: { $gt: now, $lte: twoHoursFromNow }
                };
                break;
            case 'later':
                // available after 2 hours
                dateFilter = {
                    startDateTime: { $gt: twoHoursFromNow }
                };
                break;
            default:
                throw new Error("Invalid feed type");
        }

        // Exclude the current user's own moments from the feed
        const query = { active: true, userId: { $ne: userId }, organizationId, ...dateFilter };
        if (categoryId) {
            query.categoryId = categoryId;
        }

        // 1. Get total count matching the filters (before limit pagination)
        const totalCount = await Moment.countDocuments(query);

        // 2. Fetch actual documents
        let momentsQuery = Moment.find(query)
            .populate('categoryId', 'name subcategories')
            .populate('userId', 'name jobRole department') // Bring the user details directly
            .sort({ startDateTime: 1 }); // Sort by soonest

        if (limit) {
            momentsQuery = momentsQuery.limit(limit);
        }

        const moments = await momentsQuery.lean();

        // Attach boolean indicate if the current user has liked each specific moment
        const momentIds = moments.map(m => m._id);
        const userLikes = await MomentLike.find({
            userId,
            momentId: { $in: momentIds }
        }).lean();

        const likedMomentIds = new Set(userLikes.map(like => like.momentId.toString()));

        // For live moments: batch-check which creators are currently in an active call
        // This gives the accurate "isInCall" at the time of the API fetch.
        // WebSocket events will keep this up-to-date in real-time after initial load.
        let busyUserIds = new Set();
        if (type === 'live' && moments.length > 0) {
            const creatorIds = [...new Set(moments.map(m => m.userId?._id?.toString() || m.userId?.toString()))].filter(Boolean);
            const activeCalls = await Call.find({
                $or: [
                    { callerId: { $in: creatorIds }, status: { $in: ['ringing', 'accepted', 'ongoing'] } },
                    { receiverId: { $in: creatorIds }, status: { $in: ['ringing', 'accepted', 'ongoing'] } }
                ]
            }).select('callerId receiverId').lean();

            activeCalls.forEach(call => {
                busyUserIds.add(call.callerId.toString());
                busyUserIds.add(call.receiverId.toString());
            });
        }

        const mappedMoments = moments.map(moment => {
            let subcatName = null;
            if (moment.categoryId && moment.categoryId.subcategories) {
                const subcat = moment.categoryId.subcategories.find(
                    s => s._id.toString() === moment.subcategoryId.toString()
                );
                if (subcat) {
                    subcatName = subcat.name;
                }
                moment.categoryId = { _id: moment.categoryId._id, name: moment.categoryId.name };
            }
            
            // Determine the creator's user ID (after populate, userId is an object)
            const creatorId = moment.userId?._id?.toString() || moment.userId?.toString() || '';
            
            // Calculate "Ends in X m/h" or "Starts in X m/h" client can easily derive, but let's send standard dates
            return {
                ...moment,
                subcategoryName: subcatName,
                isLikedByMe: likedMomentIds.has(moment._id.toString()),
                isInCall: busyUserIds.has(creatorId),
            };
        });

        return { moments: mappedMoments, totalCount };
    }
}

module.exports = new MomentService();
