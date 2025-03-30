const mongoose = require('mongoose');

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
      }, // Only require stockId for stock-related actions
    },
  },
  { timestamps: true }
);

// Automatically populate stockId when fetching activities
activitySchema.pre(/^find/, function (next) {
  this.populate('stockId', 'sold'); // Populate only the 'sold' field of Stock
  next();
});

module.exports = mongoose.model('Activity', activitySchema);
