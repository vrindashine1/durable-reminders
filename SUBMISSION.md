
# Product Engineering Challenge Submission

## Candidate

- Name: vrinda shine
- Email: vrindashine725@gmail.com
- GitHub: https://github.com/vrindashine1/durable-reminders.git
- Selected problem: Problem 3: Durable Reminders and Follow-ups
- Demo video: https://drive.google.com/file/d/1fKqXFFEr6tBdDo2lEhupy9mQii-a8vaa/view?usp=sharing
---

## Run the project

*Prerequisites*
- **Node.js** (v18 or higher)
- **MongoDB** running locally on port `27017`

*Setup and Run Commands*
1. Clone the repository and install dependencies:
   ```bash
   git clone 
   cd durable-reminders-service
   npm install
   
2. Ensure local MongoDB service is running:
   net start MongoDB 

3. Start the application server:
   npm start
Open your browser and navigate to http://localhost:3000 to access the web interface.

*Triggering Scenarios*
-Successful Scenario: Open http://localhost:3000, create a reminder scheduled 1 minute in the future, and watch it transition automatically from SCHEDULED -> RUNNING -> DELIVERED.

-Failure / Recovery Scenario: Create a reminder, simulate a process crash by stopping the server (Ctrl + C), advance time past the reminder's execution time using the test suite/clock, and restart the server (npm start). The background worker immediately picks up and processes the overdue reminder.

## Run the tests
Run all deterministic acceptance tests (AC1–AC7):
-npm test

## Acceptance scenarios and verification
*Completed Acceptance Scenarios*

AC1: Scheduled delivery
Given an active reminder in a named time zone
When the injected clock reaches its scheduled instant
Then one notification is delivered and the item reaches delivered state with recorded history

AC2: Restart recovery
Given an active reminder becomes due while the service is stopped
When the service restarts
Then it discovers and processes the overdue work according to a documented policy

AC3: Temporary failure
Given the notification destination temporarily fails
When delivery is attempted
Then the failure is recorded, retry is bounded, and eventual success or terminal failure is visible

AC4: Duplicate execution
Given the same scheduled occurrence is claimed or executed more than once
When the delivery path runs repeatedly
Then the destination observes one logical notification for that occurrence

AC5: Edit before execution
Given a scheduled item has not completed
When the user changes its time or content
Then the effective version is clear and the superseded schedule does not later produce an unexpected notification

AC6: Cancellation
Given an active item is cancelled before delivery commits
When workers continue polling or retrying
Then the documented cancellation policy is enforced and no later successful delivery is incorrectly recorded

AC7: Time-zone boundary
Given reminders use different IANA time zones, including one daylight-saving boundary
When their local requested times are converted
Then their execution instants are deterministic and documented


*Verification Benchmark*
-Command used to run the verification benchmark:
- npm run benchmark

*Observed Result:*
- DELIVERED: 10 — Standard reminders successfully claimed and delivered.

- SCHEDULED: 10 — Reminders in active backoff retry loops and bounded attempts.

- CANCELLED: 5 — Pre-cancelled items correctly ignored by the worker.

Total Processed Items: 25 test items across multiple states and timezones.

*Failure/Recovery Scenario in Demo Video*
- In the video, a service crash is simulated while reminders are scheduled. The clock is fast-forwarded past the execution instant, and upon restarting the server, the background worker automatically claims the overdue reminders and marks them DELIVERED.
- https://drive.google.com/file/d/1fKqXFFEr6tBdDo2lEhupy9mQii-a8vaa/view?usp=sharing

## Architecture and data flow

- API / Web UI Layer (src/routes/, public/): Accepts user input to schedule, edit, view, or cancel reminders.

- Database Layer (src/models/Reminder.js): MongoDB acts as the single source of truth, storing state (SCHEDULED, RUNNING, DELIVERED, CANCELLED, FAILED), execution history, and atomic locks (lockedAt).

- Background Worker (src/services/SchedulerService.js): Polls MongoDB periodically for due tasks (scheduledAtUTC <= now). It -claims tasks atomically using findOneAndUpdate, preventing race conditions.

-Time & Clock Utility (src/utils/Clock.js, src/utils/timezone.js): Handles IANA timezone conversions to UTC and provides fast-forwarding time capabilities for tests.

## Technology choices
- Node.js & Express.js: Lightweight, non-blocking asynchronous event loop ideal for polling background tasks.
- MongoDB & Mongoose: Selected because atomic operations (findOneAndUpdate) allow using the database directly as a durable job -queue without introducing complex external infrastructure like Redis or BullMQ.
- Luxon: Excellent IANA timezone parsing and Daylight Saving Time (DST) handling capabilities.
- Jest & Supertest: Robust testing frameworks for deterministic API and model validation.

## Important decisions

1. Database Polling with Atomic Locks: Instead of in-memory setTimeout or external queues, MongoDB findOneAndUpdate was chosen to guarantee that tasks survive restarts and are never claimed by two workers simultaneously.

2. Injectable Clock Pattern: Decoupled real system time from schedule evaluation, allowing tests and benchmarks to fast-forward hours in milliseconds.

3. UTC Uniformity: All user-provided local timestamps are immediately normalized to UTC before persisting to storage.


## Assumptions and limitations

- Out of Scope: Natural language date parsing (e.g., "remind me next Tuesday"), SMS/Email integration (uses internal delivery logs), and user authentication/multi-tenancy.

- Limitation: Polling intervals (e.g., every 5 seconds) trade off instantaneous sub-second execution for architectural simplicity and database safety.

## Production and scale

If scaling this system for high production traffic:

1. Dedicated Queue Infrastructure: Replace database polling with a distributed message queue like Redis (BullMQ) or AWS SQS to handle millions of concurrent reminders without overloading MongoDB indexes.

2. Database Sharding: Partition the MongoDB collection by user ID or hashed idempotency keys.

3. Distributed Lock Manager: Use Redlock or ZooKeeper for sub-second distributed locking across hundreds of worker nodes.

## AI usage
- Tools Used: chat Gpt
- Contribution: Used for research on Luxon timezone edge cases, refining unit test edge cases, and drafting initial documentation outlines.
- Verification Process: All code, application logic, and test suites were written, reviewed, debugged, and fully validated locally using `npm test` and `npm run benchmark`.

## Credibility note

-Problem Solved: I built an eCommerce web application to provide a complete online shopping flow, including user authentication, product browsing, cart management, checkout, and order management.

-Personal Contribution: I built the application using React, Node.js, Express.js, and MongoDB. I implemented REST APIs, authentication, database models, product management, cart and order functionality, and the integration between the frontend and backend. I also debugged and tested the major user flows.

-Scale / Complexity: This was a personal project, so it was not operated at commercial production scale. The main complexity was coordinating authentication, API routes, database operations, frontend state, and different user flows such as customer and admin functionality.

-Key Engineering Decision: One important decision was to keep the backend organized around REST APIs, middleware, controllers, and MongoDB models. This made the code easier to debug and helped me understand how a real backend is structured.

-Evidence: https://ecommerce-mern-deploy-to-render-2024-1.onrender.com


