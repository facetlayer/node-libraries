import { errorDetailsToString } from "./Errors";
import { c_fail, c_item, c_log_error, c_log_info, c_log_warn } from "./EventType";
import { Stream } from "./Stream";

export function toConsoleLog(label?: string) {
    const stream = new Stream();

    stream.pipe(evt => {
        switch (evt.t) {
        case c_item:
            console.log(label || '', JSON.stringify(evt.item));
            break;
        case c_fail:
            console.error(label || '', `[fail]`, errorDetailsToString(evt.error));
            break;
        case c_log_info:
            console.log(label || '', `[info]`, evt.details);
            break;
        case c_log_error:
            console.error(label || '', errorDetailsToString(evt.error));
            break;
        case c_log_warn:
            console.warn(label || '', `[warn]`, evt.details);
            break;
        }
    });

    return stream;
}