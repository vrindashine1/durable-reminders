// src/server.js
const mongoose = require('mongoose');
const app = require('./app');
const SchedulerService = require('./services/SchedulerService');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/durable_reminders';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');

    // Start background scheduler worker
    const scheduler = new SchedulerService(5000); // Poll every 5s
    scheduler.start();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });