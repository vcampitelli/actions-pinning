import chalk, {Chalk} from 'chalk';
import {format} from 'node:util';

export enum Verbosity {
    Off,
    Verbose,
    Debug,
}

export enum Log {
    Success,
    Error,
    Warning,
    Info,
    Debug,
}

export default class Logger {
    private readonly maxLevelLength: number = 0;

    constructor (
        protected verbosity: Verbosity,
    ) {
        const largestString = this.colorLevel(Log.Success, chalk.green);
        this.maxLevelLength = largestString.length;
    }

    public log (
        message: string | string[],
        level: Log = Log.Info,
    ): void {
        if ((level === Log.Debug) && (this.verbosity !== Verbosity.Debug)) {
            return;
        }
        // if ((level === Log.Info) && (this.verbosity === Verbosity.Off)) {
        //     return;
        // }

        let method = console.log;
        let color: Chalk = chalk.reset;
        switch (level) {
            case Log.Error:
                method = console.error;
                color = chalk.red;
                break;

            case Log.Warning:
                method = console.warn;
                color = chalk.yellow;
                break;

            case Log.Info:
                method = console.info;
                color = chalk.cyan;
                break;

            case Log.Debug:
                method = console.debug;
                color = chalk.magenta;
                break;

            case Log.Success:
                color = chalk.green;
                break;
        }

        if (Array.isArray(message)) {
            message = format(...message);
        }

        const formattedLevel = this.colorLevel(level, color).padEnd(this.maxLevelLength);

        method(`${formattedLevel} ${message}`);
    }

    private colorLevel (level: Log, color: Chalk): string {
        return color(` ${Log[level].toLowerCase()} `);
    }


    public error (
        message: string | string[],
    ): void {
        this.log(message, Log.Error);
    }

    public warn (
        message: string | string[],
    ): void {
        this.log(message, Log.Warning);
    }

    public info (
        message: string | string[],
    ): void {
        this.log(message, Log.Info);
    }

    public debug (
        message: string | string[],
    ): void {
        this.log(message, Log.Debug);
    }

    public success (
        message: string | string[],
    ): void {
        this.log(message, Log.Success);
    }
}
