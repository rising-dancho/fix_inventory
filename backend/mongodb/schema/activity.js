const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: { type: String, required: true },
    stockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stock',
      required: function () {
        return this.action !== 'Logged In';
      },
    },
    countedAmount: { type: Number, default: 0 }, // ✅ Ensure this is used
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);
