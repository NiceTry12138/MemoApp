import { BaseTask, ITaskConfig } from '../core/BaseTask';

export interface ILogTaskConfig extends ITaskConfig {
    content: string; // The content of the log
    // LogTask doesn't need execution
}

export class LogTask extends BaseTask {
    public content: string;

    constructor(config: ILogTaskConfig) {
        super(config);
        this.content = config.content;
    }

    // No start/stop needed, it's just data
    public start(): void {}
    public stop(): void {}
}
