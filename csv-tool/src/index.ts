
import { Stream, c_item, c_done, c_fail, } from '@facetlayer/streams'
import Fs from 'fs'

export interface CsvFormatOptions {
    fields: string[] | Record<string, string>
    /** Preferred spelling */
    separator?: '\t' | ','
    /** @deprecated Use `separator` instead. */
    seperator?: '\t' | ','
    /** Include header row. Defaults to true. */
    includeHeader?: boolean
}

export interface CsvFileOptions extends CsvFormatOptions {
    filename: string
    flags?: string
}

function maybeQuote(s: string) {
    if (s == null)
        return '';

    if (typeof s !== 'string') {
        s = s + '';
    }

    const needsQuote = s.includes(',') ||
        s.includes('\r') || s.includes('\n') || s.includes('\t')
        || s.includes('"');

    if (needsQuote) {
        return `"${s.replace(/"/g, '""')}"`
    } else {
        return s;
    }
}

export function createCsvFileStream(options: CsvFileOptions): Stream<any> {
    const input = new Stream();
    const fileOut = Fs.createWriteStream(options.filename, { flags: options.flags });

    transformToCsvFormat(input, options)
    .pipe(evt => {
        switch (evt.t) {
        case c_item:
            fileOut.write(evt.item.line + '\n');
            break;
        case c_done:
            fileOut.end();
            break;
        case c_fail:
            console.error(evt.error);
            fileOut.end();
            break;
        }
    });

    return input;
}

export function transformToCsvFormat(input: Stream<any>, options: CsvFormatOptions): Stream<{ line: string }> {
    const output = new Stream();
    const fieldsList = Array.isArray(options.fields) ? options.fields : Object.keys(options.fields);

    const separator = options.separator ?? options.seperator ?? ',';

    if (options.includeHeader !== false) {
        let headerLine = '';
        let first = true;
        for (const attr of fieldsList) {
            if (!first)
                headerLine += separator
            headerLine += maybeQuote(attr);
            first = false;
        }
        output.item({ line: headerLine });
    }

    input.pipe((msg) => {
        switch (msg.t) {
        case c_item: {
            const item = msg.item;
            let line = ''

            let first = true;
            for (const attr of fieldsList) {
                if (!first)
                    line += separator;
                let value = item[attr];
                if (value == null)
                    value = ''
                    
                line += maybeQuote(value);
                first = false;
            }

            output.item({ line });
            break;
        }
        default:
            output.event(msg);
            break;
        }
    });

    return output;
}

