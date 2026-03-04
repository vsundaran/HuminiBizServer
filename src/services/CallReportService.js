const Call = require('../models/Call');
const CallReport = require('../models/CallReport');
const ReportReason = require('../models/ReportReason');
const CustomError = require('../utils/CustomError');

class CallReportService {
    
    /**
     * Fetch all active Report Reasons (Master Data)
     */
    async getReportReasons() {
        return await ReportReason.find({ active: true }).select('name').lean();
    }

    /**
     * Submit a report against a user for a specific call
     */
    async submitReport(reporterId, organizationId, payload) {
        const { callId, reasonId, description } = payload;

        // 1. Validate the reason exists
        const reason = await ReportReason.findById(reasonId);
        if (!reason || !reason.active) {
            throw new CustomError('Invalid or inactive report reason', 400);
        }

        // 2. If 'Others' is selected, a description is strictly required
        if (reason.name.toLowerCase() === 'others' && (!description || description.trim() === '')) {
            throw new CustomError('Description is required when choosing "Others"', 400);
        }

        // 3. Validate the Call exists in this organization and the reporter was a participant
        const call = await Call.findOne({
            _id: callId,
            organizationId,
            $or: [{ callerId: reporterId }, { receiverId: reporterId }]
        });

        if (!call) {
            throw new CustomError('Call not found or unauthorized to report', 404);
        }

        // 4. Determine who the reported user is (the other participant)
        const reportedUserId = call.callerId.toString() === reporterId.toString() 
            ? call.receiverId 
            : call.callerId;

        // 5. Check if reporter already reported this specific call (Prevent spam)
        const existingReport = await CallReport.findOne({ callId, reporterId });
        if (existingReport) {
            throw new CustomError('You have already submitted a report for this call', 400);
        }

        // 6. Create the report
        const report = await CallReport.create({
            callId,
            reporterId,
            reportedUserId,
            organizationId,
            reasonId,
            description: description ? description.trim() : undefined
        });

        return report;
    }

}

module.exports = new CallReportService();
