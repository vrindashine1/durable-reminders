// src/app.js
const express = require('express');
const path = require('path');
const reminderRoutes = require('./routes/reminderRoutes');

const app = express();
app.use(express.json());

// Serve static UI files from public directory
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/reminders', reminderRoutes);

module.exports = app;