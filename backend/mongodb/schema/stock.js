const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  item: String,
  total_stock: Number,
  sold: Number,
  available_stock: { type: Number, default: 0 },
});

module.exports = mongoose.model('Stock', stockSchema);
