// src/utils/Clock.js
class Clock {
  constructor() {
    this.customTime = null;
  }

  now() {
    return this.customTime ? new Date(this.customTime) : new Date();
  }

  setTime(dateOrIso) {
    this.customTime = new Date(dateOrIso).getTime();
  }

  advanceByMs(ms) {
    const current = this.now().getTime();
    this.customTime = current + ms;
  }

  reset() {
    this.customTime = null;
  }
}

module.exports = new Clock();