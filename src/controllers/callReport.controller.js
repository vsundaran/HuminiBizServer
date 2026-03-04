const CallReportService = require('../services/CallReportService');

class CallReportController {
    
    /**
     * Get Report Reasons Master Data
     * @route GET /api/call-reports/reasons
     */
    async getReasons(req, res, next) {
        try {
            const reasons = await CallReportService.getReportReasons();
            res.status(200).json({
                success: true,
                message: 'Report reasons fetched successfully',
                data: reasons,
                error: null
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Submit a new Call Report
     * @route POST /api/call-reports
     */
    async submitReport(req, res, next) {
        try {
            const reporterId = req.user.id;
            const organizationId = req.user.organizationId;
            
            const report = await CallReportService.submitReport(reporterId, organizationId, req.body);
            
            res.status(201).json({
                success: true,
                message: 'Report submitted successfully. Thank you for keeping the community safe.',
                data: report,
                error: null
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CallReportController();
