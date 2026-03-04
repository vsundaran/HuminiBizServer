const User = require('../models/User');
const CustomError = require('../utils/CustomError');

class UserService {
    /**
     * Update user profile details
     * @param {string} userId - ID of the user
     * @param {Object} updateData - Data to update (name, department, jobRole)
     * @returns {Object} Updated user document
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
}

module.exports = new UserService();
