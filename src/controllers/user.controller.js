const UserService = require('../services/UserService');

class UserController {
    /**
     * Update Profile
     * @route PUT /users/profile
     */
    async updateProfile(req, res, next) {
        try {
            const userId = req.user.id; // From requireAuth middleware
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
                error: null
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new UserController();
