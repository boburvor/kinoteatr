const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  movieId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  hall: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  rows: {
    type: Number,
    default: 5
  },
  seatsPerRow: {
    type: Number,
    default: 8
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Session', sessionSchema);
