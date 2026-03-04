const Category = require('../models/Category');

class CategoryController {
    /**
     * Get all active categories with their active subcategories
     * @route GET /api/categories
     */
    async getCategories(req, res, next) {
        try {
            // Fetch only active categories and only include active subcategories
            const categories = await Category.find({ active: true })
                .lean()
                .select('-__v -createdAt -updatedAt'); // Exclude unnecessary fields

            // Filter out inactive subcategories from each category
            const filteredCategories = categories.map(category => ({
                ...category,
                subcategories: category.subcategories.filter(sub => sub.active)
            }));

            res.status(200).json({
                success: true,
                message: 'Categories fetched successfully',
                data: filteredCategories,
                error: null
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CategoryController();
