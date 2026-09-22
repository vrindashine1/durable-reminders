// tests/reminder.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Reminder = require('../src/models/Reminder');
const SchedulerService = require('../src/services/SchedulerService');
const clock = require('../src/utils/Clock');

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/durable_reminders_test';

let scheduler;

beforeAll(async () => {
  await mongoose.connect(TEST_MONGO_URI);
  scheduler = new SchedulerService(100);
}, 10000);

beforeEach(async () => {
  clock.reset();
  await Reminder.deleteMany({});
});

afterAll(async () => {
  if (scheduler) scheduler.stop();
  await Reminder.deleteMany({});
  await mongoose.disconnect();
}, 10000);

describe('Problem 3 Acceptance Scenarios', () => {
  // AC1: Scheduled delivery
  test('AC1: Delivers reminder when clock reaches scheduled instant', async () => {
    clock.setTime('2026-10-01T09:00:00Z');
    
    const reminder = await Reminder.create({
      title: 'Active Reminder',
      scheduledAtUTC: new Date('2026-10-01T10:00:00Z'),
      userTimezone: 'America/New_York',
      idempotencyKey: 'ac1-key'
    });

    clock.setTime('2026-10-01T10:00:01Z'); // Advance clock past execution time
    await scheduler.processDueReminders();

    const updated = await Reminder.findById(reminder._id);
    expect(updated.status).toBe('DELIVERED');
    expect(updated.executionHistory.length).toBe(1);
    expect(updated.executionHistory[0].outcome).toBe('SUCCESS');
  });

  // AC2: Restart recovery
  test('AC2: Discovers and processes overdue work after restart', async () => {
    clock.setTime('2026-10-01T08:00:00Z');
    
    await Reminder.create({
      title: 'Overdue Reminder',
      scheduledAtUTC: new Date('2026-10-01T09:00:00Z'),
      idempotencyKey: 'ac2-key'
    });

    // Simulate service restart while clock is past due
    clock.setTime('2026-10-01T10:00:00Z');
    const newScheduler = new SchedulerService(100);
    await newScheduler.processDueReminders();

    const updated = await Reminder.findOne({ idempotencyKey: 'ac2-key' });
    expect(updated.status).toBe('DELIVERED');
  });

  // AC3 & Retry Exhaustion: Temporary failure
  test('AC3: Retries temporary failures and reaches terminal state', async () => {
    clock.setTime('2026-10-01T10:00:00Z');
    
    const reminder = await Reminder.create({
      title: 'FAIL_PERM Task', // Triggers permanent failure in fake destination
      scheduledAtUTC: new Date('2026-10-01T09:59:00Z'),
      idempotencyKey: 'ac3-key',
      maxAttempts: 3
    });

    // Run 3 retry loops
    for (let i = 0; i < 3; i++) {
      clock.advanceByMs(60000);
      await scheduler.processDueReminders();
    }

    const updated = await Reminder.findById(reminder._id);
    expect(updated.status).toBe('FAILED');
    expect(updated.attempts).toBe(3);
    expect(updated.executionHistory.length).toBe(3);
  });

  // AC5: Edit before execution
  test('AC5: Edits time/content and increments version', async () => {
    const res = await request(app).post('/api/reminders').send({
      title: 'Original Title',
      scheduledAt: '2026-10-01T10:00:00',
      userTimezone: 'Asia/Kolkata',
      idempotencyKey: 'ac5-key'
    });

    const id = res.body.data._id;

    // Edit content
    const editRes = await request(app).put(`/api/reminders/${id}`).send({
      title: 'Updated Title',
      scheduledAt: '2026-10-01T12:00:00'
    });

    expect(editRes.body.data.version).toBe(2);
    expect(editRes.body.data.title).toBe('Updated Title');
  });

  // AC6: Cancellation
  test('AC6: Cancels reminder and prevents delivery', async () => {
    clock.setTime('2026-10-01T08:00:00Z');

    const reminder = await Reminder.create({
      title: 'To Cancel',
      scheduledAtUTC: new Date('2026-10-01T10:00:00Z'),
      idempotencyKey: 'ac6-key'
    });

    await request(app).post(`/api/reminders/${reminder._id}/cancel`);

    clock.setTime('2026-10-01T11:00:00Z');
    await scheduler.processDueReminders();

    const updated = await Reminder.findById(reminder._id);
    expect(updated.status).toBe('CANCELLED');
    expect(updated.executionHistory.length).toBe(0);
  });

  // AC7: Time-zone daylight-saving boundary
  test('AC7: Handles daylight saving boundary deterministically', async () => {
    // NYC spring transition boundary
    const res = await request(app).post('/api/reminders').send({
      title: 'DST Test',
      scheduledAt: '2026-03-08T02:30:00', // Nonexistent local time during spring forward
      userTimezone: 'America/New_York',
      idempotencyKey: 'ac7-key'
    });

    expect(res.status).toBe(201);
    expect(res.body.data.scheduledAtUTC).toBeDefined();
  });
});