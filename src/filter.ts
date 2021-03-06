import { ArgumentError, LogLevelKeys } from '@nw55/common';
import { LogMessage } from './common';
import { LogLevel } from './log-level';

export interface LogFilter {
    shouldLog: (level: LogLevel, source?: string) => boolean;

    shouldLogMessage: (message: LogMessage) => boolean;
}

type LogFilterFunction = (level: LogLevel, source?: string) => boolean;

const logNothingFilter: LogFilter = {
    shouldLog: () => false,
    shouldLogMessage: () => false
};

export function defaultLogFilter(filter: LogFilterFunction | LogFilter | boolean): LogFilter {
    if (filter === true)
        return LogLevel.All;
    if (filter === false)
        return logNothingFilter;
    if (typeof filter !== 'function')
        return filter;
    return {
        shouldLog: filter,
        shouldLogMessage: message => filter(message.level, message.source)
    };
}

interface LogFilterMap {
    [sourcePrefix: string]: LogLevel | LogLevelKeys;
}

export class SourcePrefixLogFilter implements LogFilter {
    private _defaultLevelValue: number;
    private _separator: string;
    private _prefixMap = new Map<string, number>();
    private _minLevelValue: number;

    constructor(defaultLevel: LogLevel | LogLevelKeys, map: LogFilterMap, separator = '/') {
        if (separator === '')
            throw new ArgumentError();

        this._defaultLevelValue = LogLevel.get(defaultLevel).value;
        this._separator = separator;

        this._minLevelValue = this._defaultLevelValue;
        for (const [prefix, levelOrLevelKey] of Object.entries(map)) {
            const levelValue = LogLevel.get(levelOrLevelKey).value;
            this._minLevelValue = Math.min(this._minLevelValue, levelValue);
            this._prefixMap.set(prefix, levelValue);
        }
    }

    shouldLog(level: LogLevel, source?: string) {
        if (level.value < this._minLevelValue)
            return false;
        if (source !== undefined) {
            let prefix = source;
            while (true) {
                const prefixLevelValue = this._prefixMap.get(prefix);
                if (prefixLevelValue !== undefined) {
                    if (prefix !== source)
                        this._prefixMap.set(source, prefixLevelValue);
                    return level.value >= prefixLevelValue;
                }
                const lastSeparatorIndex = prefix.lastIndexOf(this._separator);
                if (lastSeparatorIndex < 0)
                    break;
                prefix = prefix.slice(0, lastSeparatorIndex);
            }
            this._prefixMap.set(source, this._defaultLevelValue);
        }
        return level.value >= this._defaultLevelValue;
    }

    shouldLogMessage(message: LogMessage) {
        return this.shouldLog(message.level, message.source);
    }
}
