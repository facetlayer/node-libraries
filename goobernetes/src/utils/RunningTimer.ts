
export class RunningTimer {
    private timeOfLastCheck: number;

    constructor() {
        this.timeOfLastCheck = Date.now();
    }

    checkElapsedSecs() {
        const now = Date.now();
        const elapsed = now - this.timeOfLastCheck;
        this.timeOfLastCheck = now;
        return elapsed / 1000;
    }
}