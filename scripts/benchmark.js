// scripts/benchmark.js
const mongoose = require('mongoose');
const Reminder = require('../src/models/Reminder');
const SchedulerService = require('../src/services/SchedulerService');
const clock = require('../src/utils/Clock');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/durable_reminders_benchmark';

async function runBenchmark() {
  await mongoose.connect(MONGO_URI);
  await Reminder.deleteMany({});

  console.log('--- STARTING VERIFICATION BENCHMARK ---');
  clock.setTime('2026-10-01T00:00:00Z');

  // 1. Create 25 scheduled items across multiple states and timezones
  console.log('Creating 25 test items across multiple states and timezones...');
  
  for (let i = 1; i <= 10; i++) {
    await Reminder.create({
      title: `Standard Delivery ${i}`,
      scheduledAtUTC: new Date('2026-10-01T01:00:00Z'),
      userTimezone: 'Asia/Kolkata',
      idempotencyKey: `bm-std-${i}`
    });
  }

  for (let i = 1; i <= 5; i++) {
    await Reminder.create({
      title: `FAIL_TEMP Retry ${i}`,
      scheduledAtUTC: new Date('2026-10-01T01:00:00Z'),
      userTimezone: 'America/New_York',
      idempotencyKey: `bm-temp-${i}`
    });
  }

  for (let i = 1; i <= 5; i++) {
    await Reminder.create({
      title: `FAIL_PERM Failure ${i}`,
      scheduledAtUTC: new Date('2026-10-01T01:00:00Z'),
      userTimezone: 'America/New_York',
      idempotencyKey: `bm-perm-${i}`
    });
  }

  for (let i = 1; i <= 5; i++) {
    const item = await Reminder.create({
      title: `Cancelled Item ${i}`,
      scheduledAtUTC: new Date('2026-10-01T01:00:00Z'),
      userTimezone: 'Asia/Kolkata',
      idempotencyKey: `bm-cancel-${i}`
    });
    item.status = 'CANCELLED';
    await item.save();
  }

  // 2. Simulate stopping and restarting the service
  console.log('Simulating service stop and restart...');
  let scheduler = new SchedulerService(100);
  scheduler.stop(); // Service stopped

  // Advance clock while offline
  clock.setTime('2026-10-01T05:00:00Z');
  console.log('Clock advanced to 2026-10-01T05:00:00Z while service was offline.');

  // Restart scheduler and process due items
  scheduler = new SchedulerService(100);
  await scheduler.processDueReminders();
  await scheduler.processDueReminders(); // Process retries

  // 3. Aggregate and output terminal state counts
  const counts = await Reminder.aggregate([
    { $group: { _id: '$status', count: {$sum: 1 } } }
  ]);

  console.log('\n--- BENCHMARK RESULTS ---');
  counts.forEach(c => console.log(`${c._id}: ${c.count}`));

  await mongoose.disconnect();
  console.log('--- BENCHMARK COMPLETE ---');
}

runBenchmark().catch(console.error);