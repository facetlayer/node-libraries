
import { Stream, } from './Stream'
import { StreamEvent, c_done, c_item, c_fail, c_log_info, c_log_warn, c_log_error, c_hint } from './EventType'

const KnownEventTypes = new Set([c_done, c_item, c_fail, c_log_info, c_log_warn, c_log_error, c_hint]);

export class StreamProtocolValidator {
    description: string
    hasSentDone: boolean = false
    hasSentFail: boolean = false
    hasSeenFirstItem: boolean = false
    hasSeenHint: boolean = false

    constructor(description: string) {
        this.description = description;
    }

    check(msg: StreamEvent) {
        if (!KnownEventTypes.has(msg.t)) {
            const error = `Stream validation failed for (${this.description}), unknown event type: ${JSON.stringify(msg)}`;
            console.error(error);
            throw new Error(error);
        }

        // After the stream is closed, no more messages are allowed.
        if (this.hasSentDone || this.hasSentFail) {
            const error = `Stream validation failed for (${this.description}), got message after the stream is closed: ${JSON.stringify(msg)}`;
            console.error(error);
            throw new Error(error);
        }

        // Hints must appear before any items.
        if (msg.t === c_hint) {
            if (this.hasSeenFirstItem) {
                const error = `Stream validation failed for (${this.description}), got 'hint' event after the first 'item' event`;
                console.error(error);
                throw new Error(error);
            }
            if (this.hasSeenHint) {
                const error = `Stream validation failed for (${this.description}), got multiple 'hint' events`;
                console.error(error);
                throw new Error(error);
            }
            this.hasSeenHint = true;
        }

        // Update state

        if (msg.t === c_item) {
            this.hasSeenFirstItem = true;
        }

        if (msg.t === c_done) {
            this.hasSentDone = true;
        }

        if (msg.t === c_fail) {
            this.hasSentFail = true;
        }
    }

    // Called when the upstream producer finishes. Verifies that the stream
    // was terminated with either a 'done' or 'fail' event. Call this after
    // you've stopped feeding events to check() to detect streams that
    // were abandoned without closing.
    finalize() {
        if (!this.hasSentDone && !this.hasSentFail) {
            const error = `Stream validation failed for (${this.description}), stream was never closed (no 'done' or 'fail' event)`;
            console.error(error);
            throw new Error(error);
        }
    }
}

export function wrapStreamInValidator(description: string, after: Stream): Stream {
    const before = new Stream();
    const validator = new StreamProtocolValidator(description);

    before.pipe(evt => {
        validator.check(evt);
        after.event(evt);
    });

    return before;
}
