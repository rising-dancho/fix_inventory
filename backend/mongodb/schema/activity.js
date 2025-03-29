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
      required: true, // ✅ Ensure every activity is linked to a stock item
    }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', activitySchema);