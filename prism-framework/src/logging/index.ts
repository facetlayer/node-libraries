let useStderr = false;

/**
 * When enabled, logInfo writes to stderr instead of stdout.
 * This is used in stdin protocol mode to avoid corrupting the JSON protocol on stdout.
 */
export function setLogStderr(enabled: boolean): void {
    useStderr = enabled;
}

export function logInfo(...args: any[]) {
    if (useStderr) {
        console.error(...args);
    } else {
        console.log(...args);
    }
}

export function logWarn(...args: any[]) {
    console.warn(...args);
}

export function logError(...args: any[]) {
    console.error(...args);
}