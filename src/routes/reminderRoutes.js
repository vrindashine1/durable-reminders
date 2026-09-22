// src/routes/reminderRoutes.js
const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const { parseToUTC } = require('../utils/timezone');
const clock = require('../utils/Clock');

// Schedule a new reminder
router.post('/', async (req, res) => {
  try {
    const { title, payload, scheduledAt, userTimezone, idempotencyKey } = req.body;

    if (!title || !scheduledAt || !idempotencyKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await Reminder.findOne({ idempotencyKey });
    if (existing) {
      return res.status(200).json({ message: 'Idempotent request recognized', data: existing });
    }

    const scheduledAtUTC = parseToUTC(scheduledAt, userTimezone || 'UTC');

    const reminder = await Reminder.create({
      title,
      payload,
      scheduledAtUTC,
      userTimezone: userTimezone || 'UTC',
      idempotencyKey,
      status: 'SCHEDULED'
    });

    res.status(201).json({ data: reminder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit time or content (AC5)
router.put('/:id', async (req, res) => {
  try {
    const { title, scheduledAt, userTimezone } = req.body;
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) return res.status(404).json({ error: 'Not found' });
    if (reminder.status !== 'SCHEDULED') {
      return res.status(400).json({ error: 'Cannot edit an item that is running or completed' });
    }

    if (title) reminder.title = title;
    if (scheduledAt) {
      reminder.scheduledAtUTC = parseToUTC(scheduledAt, userTimezone || reminder.userTimezone);
    }
    if (userTimezone) reminder.userTimezone = userTimezone;

    reminder.version += 1; // Increment version mechanism
    await reminder.save();

    res.json({ message: 'Reminder updated', data: reminder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel a scheduled reminder (AC6)
router.post('/:id/cancel', async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['SCHEDULED', 'FAILED'] } },
      { $set: { status: 'CANCELLED', lockedAt: null } },
      { new: true }
    );

    if (!reminder) {
      return res.status(400).json({ error: 'Reminder cannot be cancelled or was not found' });
    }

    res.status(200).json({ message: 'Reminder cancelled', data: reminder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch reminder details & attempt history
router.get('/:id', async (req, res) => {
  const reminder = await Reminder.findById(req.params.id);
  if (!reminder) return res.status(404).json({ error: 'Not found' });
  res.json({ data: reminder });
});

// Fast-forward injected clock (For testing/benchmarking)
router.post('/clock/advance', (req, res) => {
  const { ms } = req.body;
  clock.advanceByMs(ms || 60000);
  res.json({ currentClockTime: clock.now().toISOString() });
});

module.exports = router;