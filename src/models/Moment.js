const mongoose = require("mongoose");

const momentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category ID is required"],
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Subcategory ID is required"],
    },
    description: {
      type: String,
      required: [true, "Moment description is required"],
      trim: true,
      maxLength: 200,
    },
    startDateTime: {
      type: Date,
      required: [true, "Start date and time are required"],
    },
    endDateTime: {
      type: Date,
      required: [true, "End date and time are required"],
    },
    active: {
      type: Boolean,
      default: true,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

momentSchema.index({ organizationId: 1, active: 1, startDateTime: 1, endDateTime: 1 });

module.exports = mongoose.model("Moment", momentSchema);
