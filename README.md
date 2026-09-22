## Problem 3: Durable Reminders and Follow-Ups

# Context
A conversational companion may promise, “I’ll remind you tomorrow morning” or “Let’s continue this conversation on Friday.” That promise must survive a process restart, respect the user’s time zone, and remain correct when delivery fails or the user edits or cancels it.

A scheduler firing twice is normal in many systems. The product must still avoid two logical notifications for the same scheduled occurrence.

# Your objective

Build a small service for reminders and scheduled conversational follow-ups that remains correct across restarts and retries.

This exercise evaluates durable workflow state, scheduling, time handling, idempotency, retry policy, cancellation, and operational history. A distributed workflow platform is not expected.

##  Key Features

- **Durable Lifecycle**: Tracks reminders cleanly across states (`SCHEDULED` -> `RUNNING` -> `DELIVERED`, `CANCELLED`, or `FAILED`).
- **Safe Across Restarts**: Overdue reminders are automatically discovered and processed when the server restarts.
- **No Duplicate Deliveries**: Uses atomic MongoDB locks so multiple background workers never process the same reminder twice.
- **Timezone & DST Support**: Converts local times (`Asia/Kolkata`, `America/New_York`) to standard UTC deterministically using Luxon.
- **Retry Policy**: Retries temporary delivery failures up to 3 times before marking them as failed.
- **Injectable Clock**:Uses a controllable system clock so tests run instantly without waiting around for real minutes or    hours to pass.
- **Interactive UI**: Includes an easy-to-use web interface to create, view, and test reminders live.

##  Prerequisites

Make sure you have installed:
- **Node.js** (v18 or higher)
- **MongoDB** running locally on port `27017`


## Quick Setup & Installation

1. **Clone the repository**:
   bash
   - git clone https://github.com/vrindashine1/durable-reminders.git
   - cd durable-reminders
   
2. **Install dependencies**:
      npm install


3. **Start MongoDB (if not already running)**:
       net start MongoDB



## How to Run Tests & Verification
1. Run Automated Unit & Acceptance Tests (AC1–AC7)
npm test


2. Run Verification Benchmark
npm run benchmark


3. Start the Web Server & Interactive Dashboard
npm start
Once started, open your browser and navigate to:
 http://localhost:3000


## Project Structure
- durable-reminders\public\index.html                   - Web UI Dashboard
- durable-reminders\scripts\benchmark.js                - Verification benchmark script
- durable-reminders\src\models\Reminder.js              - Mongoose Schema & State Machine
- durable-reminders\src\routes\reminderRoutes.js        - Express API Endpoints
- durable-reminders\src\services\SchedulerService.js    - Worker polling, locking, & retry logic
- durable-reminders\src\utils\Clock.js                  - Injectable Clock Service
- durable-reminders\src\utils\timezone.js               - Luxon timezone parser
- durable-reminders\src\app.js                          - Express App setup
- durable-reminders\src\server.js                       - Entry point
- durable-reminders\tests\reminder.test.js              - Acceptance scenario tests (AC1–AC7)
- durable-reminders\README.md                           - Setup & project overview
- durable-reminders\SUBMISSION.md                       - Engineering decisions & architecture document
