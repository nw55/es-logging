import { ArgumentError } from '@nw55/common';
import { LogMessage } from './common';

export type LogFormat = (message: LogMessage) => string;

type LogFormatPlaceholder = keyof typeof knownLogFormats | LogFormat;

function placeholderLogFormat(placeholder: LogFormatPlaceholder): LogFormat {
    if (typeof placeholder === 'string')
        return knownLogFormats[placeholder];
    return placeholder;
}

function concatenatedLogFormat(segments: LogFormat[]): LogFormat {
    return message => segments.map(segment => segment(message)).join('');
}

export function logFormat(strings: TemplateStringsArray, ...placeholders: LogFormatPlaceholder[]): LogFormat {
    const segments: LogFormat[] = [];
    for (let i = 0; i < strings.length; i++) {
        if (i !== 0)
            segments.push(placeholderLogFormat(placeholders[i - 1]));
        if (strings[i] !== '')
            segments.push(logFormat.literal(strings[i]));
    }
    return concatenatedLogFormat(segments);
}

// eslint-disable-next-line no-redeclare -- merging function and namespace
export namespace logFormat {
    const datePad = (v: number) => v < 10 ? '0' + String(v) : String(v);

    const isoDateFormat: LogFormat = () => {
        const now = new Date();
        return `${now.getUTCFullYear()}-${datePad(now.getUTCMonth() + 1)}-${datePad(now.getUTCDate())}`;
    };
    const localeDateFormat: LogFormat = () => new Date().toLocaleDateString();
    const unixDateFormat: LogFormat = () => Date.now().toString();

    const isoTimeFormat: LogFormat = () => {
        const now = new Date();
        return `${datePad(now.getUTCHours())}:${datePad(now.getUTCMinutes())}:${datePad(now.getUTCSeconds())}.${(now.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5)}`;
    };
    const localeTimeFormat: LogFormat = () => new Date().toLocaleTimeString();

    const isoDateTimeFormat: LogFormat = () => new Date().toISOString();
    const localeDateTimeFormat: LogFormat = () => new Date().toLocaleString();

    export function date(format: 'iso' | 'locale' | 'unix' = 'iso'): LogFormat {
        switch (format) {
            case 'iso':
                return isoDateFormat;
            case 'locale':
                return localeDateFormat;
            case 'unix':
                return unixDateFormat;
        }
        throw new ArgumentError();
    }

    export function time(format: 'iso' | 'locale' = 'iso'): LogFormat {
        switch (format) {
            case 'iso':
                return isoTimeFormat;
            case 'locale':
                return localeTimeFormat;
        }
        throw new ArgumentError();
    }

    export function dateTime(format: 'iso' | 'locale' = 'iso'): LogFormat {
        switch (format) {
            case 'iso':
                return isoDateTimeFormat;
            case 'locale':
                return localeDateTimeFormat;
        }
        throw new ArgumentError();
    }

    const levelKeyFormat: LogFormat = message => message.level.key;
    const levelNameFormat: LogFormat = message => message.level.name;
    const levelSymbolFormat: LogFormat = message => message.level.symbol;

    export function level(format: 'key' | 'name' | 'symbol' = 'key'): LogFormat {
        switch (format) {
            case 'key':
                return levelKeyFormat;
            case 'name':
                return levelNameFormat;
            case 'symbol':
                return levelSymbolFormat;
        }
        throw new ArgumentError();
    }

    export function source(defaultSource = ''): LogFormat {
        return message => message.source ?? defaultSource;
    }

    export function sourceFormat(format: string, placeholder = '%', defaultSource = ''): LogFormat {
        return message => message.source === undefined ? defaultSource : format.replace(placeholder, message.source);
    }

    export function code(defaultCode = ''): LogFormat {
        return message => message.code ?? defaultCode;
    }

    export function codeFormat(format: string, placeholder = '%', defaultCode = ''): LogFormat {
        return message => message.code === undefined ? defaultCode : format.replace(placeholder, message.code);
    }

    const errorNameFormat: LogFormat = message => message.error?.name ?? '';
    const errorMessageFormat: LogFormat = message => message.error?.message ?? '';
    const errorNameAndMessageFormat: LogFormat = message => message.error === undefined ? '' : `${message.error.name}: ${message.error.message}`;

    export function error(format: 'name' | 'message' | 'name-and-message' = 'name-and-message'): LogFormat {
        switch (format) {
            case 'name':
                return errorNameFormat;
            case 'message':
                return errorMessageFormat;
            case 'name-and-message':
                return errorNameAndMessageFormat;
        }
        throw new ArgumentError();
    }

    export const detailsString: LogFormat = message => String(message.details);

    // eslint-disable-next-line @typescript-eslint/no-shadow
    export const message: LogFormat = message => message.message;

    export function literal(text: string): LogFormat {
        return () => text;
    }
}

const knownLogFormats = {
    date: logFormat.date(),
    time: logFormat.time(),
    datetime: logFormat.dateTime(),
    level: logFormat.level(),
    source: logFormat.source(),
    code: logFormat.code(),
    error: logFormat.error(),
    details: logFormat.detailsString,
    message: logFormat.message
};
