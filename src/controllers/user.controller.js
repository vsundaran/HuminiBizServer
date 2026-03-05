const UserService = require('../services/UserService');

class UserController {
    /**
     * Get current user's profile
     * @route GET /users/profile
     */
    async getProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const profile = await UserService.getProfile(userId);
            res.status(200).json({
                success: true,
                message: 'Profile fetched successfully',
                data: profile,
                error: null,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update Profile
     * @route PUT /users/profile
     */
    async updateProfile(req, res, next) {
        try {
            const userId = req.user.id;
            const updateData = req.body;

            const updatedUser = await UserService.updateProfile(userId, updateData);

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: {
                    id: updatedUser._id,
                    email: updatedUser.email,
                    name: updatedUser.name,
                    department: updatedUser.department,
                    jobRole: updatedUser.jobRole,
                    isProfileUpdated: updatedUser.isProfileUpdated,
                },
                error: null,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user stats (total minutes, joy given, joy received)
     * @route GET /users/stats
     */
    async getStats(req, res, next) {
        try {
            const userId = req.user.id;
            const organizationId = req.user.organizationId;
            const stats = await UserService.getUserStats(userId, organizationId);
            res.status(200).json({
                success: true,
                message: 'Stats fetched successfully',
                data: stats,
                error: null,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get leaderboard (top 3 users by call minutes)
     * @route GET /users/leaderboard
     */
    async getLeaderboard(req, res, next) {
        try {
            const organizationId = req.user.organizationId;
            const leaderboard = await UserService.getLeaderboard(organizationId);
            res.status(200).json({
                success: true,
                message: 'Leaderboard fetched successfully',
                data: leaderboard,
                error: null,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();

