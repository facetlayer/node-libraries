
export class RunningTimer {
    startTime: number;
    timeOfLastCheck: number;

    constructor() {
        this.startTime = Date.now();
        this.timeOfLastCheck = this.startTime;
    }

    checkElapsedSecs() {
        const now = Date.now();
        const elapsed = now - this.timeOfLastCheck;
        this.timeOfLastCheck = now;
        return elapsed / 1000;
    }
}