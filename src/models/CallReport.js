const mongoose = require("mongoose");

const callReportSchema = new mongoose.Schema(
  {
    callId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Call",
      required: [true, "Call ID is required"],
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter ID is required"],
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reported User ID is required"],
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
    },
    reasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReportReason",
      required: [true, "Report Reason ID is required"],
    },
    description: {
      type: String,
      trim: true,
    }
  },
  {
    timestamps: true,
  }
);

// Indexes
callReportSchema.index({ organizationId: 1, callId: 1 });
callReportSchema.index({ reporterId: 1, reportedUserId: 1 });

module.exports = mongoose.model("CallReport", callReportSchema);
