import notifier from 'node-notifier';
import { BaseTask, ITaskConfig } from '../core/BaseTask';
import { TaskRegistry } from '../core/TaskRegistry';

export interface ICountdownTaskConfig extends ITaskConfig {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    title: string;
    message: string;
}

export class CountdownTask extends BaseTask {
    public days: number;
    public hours: number;
    public minutes: number;
    public seconds: number;
    public title: string;
    public message: string;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private startedAt: number | null = null;

    constructor(config: ICountdownTaskConfig) {
        super(config);
        this.days = config.days || 0;
        this.hours = config.hours || 0;
        this.minutes = config.minutes || 0;
        this.seconds = config.seconds || 0;
        this.title = config.title || '倒计时提醒';
        this.message = config.message || '时间到！';
    }

    public getTotalMs(): number {
        return ((this.days * 24 + this.hours) * 60 + this.minutes) * 60000 + this.seconds * 1000;
    }

    public getRemainingMs(): number {
        if (!this.startedAt) return this.getTotalMs();
        const elapsed = Date.now() - this.startedAt;
        return Math.max(0, this.getTotalMs() - elapsed);
    }

    public start(): void {
        if (this.timer) {
            console.log(`Countdown [${this.name}] is already running.`);
            return;
        }
        const totalMs = this.getTotalMs();
        if (totalMs <= 0) {
            console.log(`Countdown [${this.name}] duration is 0, firing immediately.`);
            this.fire();
            return;
        }
        this.startedAt = Date.now();
        console.log(`Countdown [${this.name}] started: ${totalMs / 1000}s`);
        this.timer = setTimeout(() => this.fire(), totalMs);
    }

    public stop(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
            this.startedAt = null;
            console.log(`Countdown [${this.name}] stopped.`);
        }
    }

    private fire(): void {
        console.log(`Countdown [${this.name}] finished! Showing notification.`);
        notifier.notify({
            title: this.title,
            message: this.message,
            wait: true,
        }, (err) => {
            if (err) console.error('Countdown notification error:', err);
        });
        this.timer = null;
        this.startedAt = null;
    }
}

TaskRegistry.register('countdown', CountdownTask);
