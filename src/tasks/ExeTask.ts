import { spawn } from 'child_process';
import { ScheduledTask, IScheduledTaskConfig } from '../core/ScheduledTask';

export interface IExeTaskConfig extends IScheduledTaskConfig {
    filePath: string;
    args?: string[];
}

export class ExeTask extends ScheduledTask {
    private filePath: string;
    private args: string[];

    constructor(config: IExeTaskConfig) {
        super(config);
        this.filePath = config.filePath;
        this.args = config.args || [];
    }

    protected async execute(): Promise<void> {
        console.log(`Executing: ${this.filePath} ${this.args.join(' ')}`);

        return new Promise((resolve, reject) => {
            const child = spawn(this.filePath, this.args, {
                stdio: 'inherit', // Pipe output to parent
                shell: true // Use shell to execute
            });

            child.on('close', (code) => {
                if (code === 0) {
                    console.log(`Process exited successfully.`);
                    resolve();
                } else {
                    console.error(`Process exited with code ${code}`);
                    reject(new Error(`Process exited with code ${code}`));
                }
            });

            child.on('error', (err) => {
                console.error(`Failed to start subprocess: ${err.message}`);
                reject(err);
            });
        });
    }
}
