import { Stream } from "stream";

/*
 * unixPipeToLines
 *
 * Returns a callback that takes a Buffer stream (from stdout/stderr),
 * and calls the onCompleteLine callback for every completed line we receive.
 *
 * Useful when listening to data coming from a child process. The usage
 * looks like:
 *
 * process.stdout.on('data', unixPipeToLines(line => { ... }));
 *
 * When the stream is closed, the onCompleteLine callback will be called with 'null'.
 *
 * Returns a cleanup function that removes the event listeners. Call this function
 * when you want to stop listening to the stream to prevent memory leaks.
 *
 */
export function unixPipeToLines(stream: Stream, onCompleteLine: (s: string | null) => void): () => void {
    const normalizeLine = (line: string) => line.replace(/\r$/, '');

    // currentLine contains the string for an unfinished line (when we haven't
    // received the newline yet)
    let currentLine: string | null = null;

    const onData = (data: Buffer) => {
        const dataStr = data.toString('utf-8');
        const endsWithNewline = dataStr[dataStr.length - 1] == '\n';
        const segments = dataStr.split('\n');

        let leftover: string | null = null;

        if (!endsWithNewline) {
            // Save the last line as leftover for later.
            const pending = segments.pop();
            leftover = pending !== undefined ? normalizeLine(pending) : null;
        }

        for (let line of segments) {
            if (currentLine) {
                line = currentLine + line;
                currentLine = null;
            }
            line = normalizeLine(line);
            if (line === '')
                continue;
            onCompleteLine(line);
        }

        if (endsWithNewline && currentLine) {
            // Edge case that can happen if the incoming data is only "\n".
            onCompleteLine(normalizeLine(currentLine));
            currentLine = null;
        }

        if (leftover !== null)
            currentLine = (currentLine || '') + leftover;
    };

    const onClose = () => {
        if (currentLine) {
            onCompleteLine(normalizeLine(currentLine));
        }
        onCompleteLine(null);
    };

    stream.on('data', onData);
    stream.on('close', onClose);

    // Return cleanup function
    return () => {
        stream.off('data', onData);
        stream.off('close', onClose);
    };
}
