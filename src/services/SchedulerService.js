// src/services/SchedulerService.js
const Reminder = require('../models/Reminder');
const clock = require('../utils/Clock');

class FakeNotificationDestination {
  constructor() {
    this.deliveredKeys = new Set();
  }

  async deliver(reminder) {
    // Fail if title contains "FAIL_TEMP" to test temporary retries
    if (reminder.title.includes('FAIL_TEMP') && reminder.attempts < 2) {
      throw new Error('Temporary destination delivery failure');
    }

    // Fail permanently if title contains "FAIL_PERM"
    if (reminder.title.includes('FAIL_PERM')) {
      throw new Error('Permanent destination endpoint error');
    }

    // Deduplicate logical notifications at delivery boundary
    if (this.deliveredKeys.has(reminder.idempotencyKey)) {
      return { duplicateObserved: true };
    }

    this.deliveredKeys.add(reminder.idempotencyKey);
    return { duplicateObserved: false };
  }
}

class SchedulerService {
  constructor(pollIntervalMs = 5000, lockTimeoutMs = 30000) {
    this.pollIntervalMs = pollIntervalMs;
    this.lockTimeoutMs = lockTimeoutMs;
    this.timer = null;
    this.destination = new FakeNotificationDestination();
  }

  start() {
    this.timer = setInterval(() => this.processDueReminders(), this.pollIntervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  async processDueReminders() {
    const now = clock.now();
    const staleLockThreshold = new Date(now.getTime() - this.lockTimeoutMs);

    while (true) {
      // Find and claim overdue work
      const reminder = await Reminder.findOneAndUpdate(
        {
          status: { $in: ['SCHEDULED', 'FAILED'] },
          scheduledAtUTC: { $lte: now },
          attempts: { $lt: 3 },
          $or: [
            { lockedAt: null },
            { lockedAt: { $lte: staleLockThreshold } }
          ]
        },
        { 
          $set: { status: 'RUNNING', lockedAt: now },
          $inc: { attempts: 1 }
        },
        { new: true }
      );

      if (!reminder) break;

      await this.executeReminder(reminder);
    }
  }

  async executeReminder(reminder) {
    const now = clock.now();
    try {
      // Attempt delivery
      await this.destination.deliver(reminder);

      reminder.status = 'DELIVERED';
      reminder.lockedAt = null;
      reminder.executionHistory.push({ attemptedAt: now, outcome: 'SUCCESS' });
      await reminder.save();
    } catch (err) {
      reminder.executionHistory.push({
        attemptedAt: now,
        outcome: 'FAILURE',
        error: err.message
      });

      if (reminder.attempts >= reminder.maxAttempts) {
        reminder.status = 'FAILED';
      } else {
        reminder.status = 'SCHEDULED';
        // Exponential backoff
        const backoffMs = Math.pow(2, reminder.attempts) * 10000;
        reminder.scheduledAtUTC = new Date(now.getTime() + backoffMs);
      }
      reminder.lockedAt = null;
      await reminder.save();
    }
  }
}

module.exports = SchedulerService;