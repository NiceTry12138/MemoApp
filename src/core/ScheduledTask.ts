import * as schedule from 'node-schedule';
import { BaseTask, ITaskConfig } from './BaseTask';

export interface IScheduledTaskConfig extends ITaskConfig {
    cronExpression: string;
    isForever: boolean;
}

export abstract class ScheduledTask extends BaseTask {
    public cronExpression: string;
    public isForever: boolean;
    private job: schedule.Job | null = null;

    constructor(config: IScheduledTaskConfig) {
        super(config);
        this.cronExpression = config.cronExpression;
        this.isForever = config.isForever;
    }

    protected abstract execute(): Promise<void>;

    public start(): void {
        if (this.job) {
            console.log(`Task [${this.name}] is already running.`);
            return;
        }

        // Check if task is valid for execution
        const now = new Date();
        if (!this.isForever) {
            if (this.startDate && now < this.startDate) {
                console.log(`Task [${this.name}] not started yet. Waiting for start date.`);
                // Note: In a real system, we'd schedule the start. For now, we assume user manages start.
                // Or simply let it run but skip execution if not in range (see below).
            }
            if (this.endDate && now > this.endDate) {
                console.log(`Task [${this.name}] has expired.`);
                return;
            }
        }

        console.log(`Starting task [${this.name}] with schedule: ${this.cronExpression}`);
        
        this.job = schedule.scheduleJob(this.cronExpression, async () => {
            const current = new Date();
            
            // Runtime check for date range
            if (!this.isForever) {
                if (this.startDate && current < this.startDate) return;
                if (this.endDate && current > this.endDate) {
                    console.log(`Task [${this.name}] reached end date. Stopping.`);
                    this.stop();
                    return;
                }
            }

            try {
                console.log(`Executing task [${this.name}]...`);
                await this.execute();
                console.log(`Task [${this.name}] completed successfully.`);
            } catch (error) {
                console.error(`Task [${this.name}] failed:`, error);
            }
        });
    }

    public stop(): void {
        if (this.job) {
            this.job.cancel();
            this.job = null;
            console.log(`Task [${this.name}] stopped.`);
        }
    }

    public getNextInvocation(): Date | null {
        if (this.job) {
            return this.job.nextInvocation();
        }
        return null;
    }
}
