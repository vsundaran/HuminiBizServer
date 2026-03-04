const mongoose = require("mongoose");

const momentLikeSchema = new mongoose.Schema(
  {
    momentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Moment",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

momentLikeSchema.index({ organizationId: 1, momentId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("MomentLike", momentLikeSchema);
