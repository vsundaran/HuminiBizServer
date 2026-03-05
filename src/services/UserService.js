const User = require('../models/User');
const Call = require('../models/Call');
const CustomError = require('../utils/CustomError');

class UserService {
    /**
     * Update user profile details
     */
    async updateProfile(userId, updateData) {
        const { name, department, jobRole } = updateData;

        const user = await User.findById(userId);
        if (!user) {
            throw new CustomError('User not found', 404);
        }

        user.name = name;
        user.department = department;
        user.jobRole = jobRole;
        user.isProfileUpdated = true;

        await user.save();
        return user;
    }

    /**
     * Get current user's profile
     */
    async getProfile(userId) {
        const user = await User.findById(userId)
            .select('name email jobRole department organizationId isProfileUpdated')
            .lean();

        if (!user) {
            throw new CustomError('User not found', 404);
        }

        return {
            id: user._id,
            name: user.name || '',
            email: user.email,
            jobRole: user.jobRole || '',
            department: user.department || '',
            organizationId: user.organizationId,
            isProfileUpdated: user.isProfileUpdated,
        };
    }

    /**
     * Get user stats: total minutes spent in calls, joy given (calls made), joy received (calls received)
     */
    async getUserStats(userId, organizationId) {
        const endedCalls = await Call.find({
            organizationId,
            status: 'ended',
            $or: [{ callerId: userId }, { receiverId: userId }],
            startedAt: { $exists: true },
            endedAt: { $exists: true },
        }).lean();

        let totalMinutes = 0;
        let joyGiven = 0;
        let joyReceived = 0;

        endedCalls.forEach(call => {
            const callerId = call.callerId.toString();
            const userId_str = userId.toString();

            if (call.startedAt && call.endedAt) {
                const durationMs = new Date(call.endedAt) - new Date(call.startedAt);
                totalMinutes += Math.round(durationMs / 60000);
            }

            if (callerId === userId_str) {
                joyGiven += 1;
            } else {
                joyReceived += 1;
            }
        });

        return { totalMinutes, joyGiven, joyReceived };
    }

    /**
     * Get top 3 users by total call minutes within the organization
     */
    async getLeaderboard(organizationId) {
        const endedCalls = await Call.find({
            organizationId,
            status: 'ended',
            startedAt: { $exists: true },
            endedAt: { $exists: true },
        }).lean();

        // Aggregate total minutes per user
        const minutesByUser = {};
        endedCalls.forEach(call => {
            if (!call.startedAt || !call.endedAt) { return; }
            const durationMs = new Date(call.endedAt) - new Date(call.startedAt);
            const minutes = Math.round(durationMs / 60000);

            [call.callerId, call.receiverId].forEach(uid => {
                const key = uid.toString();
                minutesByUser[key] = (minutesByUser[key] || 0) + minutes;
            });
        });

        // Sort and take top 3
        const sorted = Object.entries(minutesByUser)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        if (sorted.length === 0) {
            return [];
        }

        const userIds = sorted.map(([id]) => id);
        const users = await User.find({ _id: { $in: userIds } })
            .select('name jobRole department')
            .lean();

        const userMap = {};
        users.forEach(u => { userMap[u._id.toString()] = u; });

        return sorted.map(([id, minutes]) => {
            const user = userMap[id] || {};
            return {
                userId: id,
                name: user.name || 'Unknown',
                jobRole: user.jobRole || '',
                minutes,
            };
        });
    }
}

module.exports = new UserService();
