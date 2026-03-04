const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
  {
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    momentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Moment",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    status: {
      type: String,
      enum: ["ringing", "accepted", "declined", "missed", "failed", "ongoing", "ended"],
      default: "ringing",
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    agoraChannelName: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// To quickly check if a user is busy (active call logic)
callSchema.index({ callerId: 1, status: 1 });
callSchema.index({ receiverId: 1, status: 1 });
// Multi-tenancy filtering pattern
callSchema.index({ organizationId: 1, status: 1 });

module.exports = mongoose.model("Call", callSchema);
