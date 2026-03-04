const mongoose = require("mongoose");

const reportReasonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Report reason name is required"],
      trim: true,
      unique: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ReportReason", reportReasonSchema);
