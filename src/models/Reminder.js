// src/models/Reminder.js
const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  attemptedAt: { type: Date, required: true },
  outcome: { type: String, enum: ['SUCCESS', 'FAILURE'], required: true },
  error: { type: String, default: null }
}, { _id: false });

const reminderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  payload: { type: Object, default: {} },
  
  scheduledAtUTC: { type: Date, required: true, index: true },
  userTimezone: { type: String, required: true, default: 'UTC' },
  
  // State machine aligned with contract: SCHEDULED, RUNNING, DELIVERED, CANCELLED, FAILED
  status: { 
    type: String, 
    enum: ['SCHEDULED', 'RUNNING', 'DELIVERED', 'CANCELLED', 'FAILED'], 
    default: 'SCHEDULED',
    index: true 
  },
  
  version: { type: Number, default: 1 }, // Prevents race conditions during edits
  
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  executionHistory: [attemptSchema], // Detailed execution attempt log
  
  lockedAt: { type: Date, default: null },
  idempotencyKey: { type: String, unique: true, required: true }
}, { timestamps: true });

reminderSchema.index({ status: 1, scheduledAtUTC: 1, lockedAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);