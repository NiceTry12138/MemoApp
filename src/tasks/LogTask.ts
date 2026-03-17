import { BaseTask, ITaskConfig } from '../core/BaseTask';
import { TaskRegistry } from '../core/TaskRegistry';

export interface ILogTaskConfig extends ITaskConfig {
    content: string;
}

export class LogTask extends BaseTask {
    public content: string;

    constructor(config: ILogTaskConfig) {
        super(config);
        this.content = config.content;
    }

    // No scheduling needed — purely a data/note entry
    public start(): void {}
    public stop(): void {}
}

TaskRegistry.register('log', LogTask);
