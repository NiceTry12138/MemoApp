import notifier from 'node-notifier';
import { ScheduledTask, IScheduledTaskConfig } from '../core/ScheduledTask';

export interface IPopupTaskConfig extends IScheduledTaskConfig {
    title: string;
    message: string;
}

export class PopupTask extends ScheduledTask {
    private title: string;
    private message: string;

    constructor(config: IPopupTaskConfig) {
        super(config);
        this.title = config.title;
        this.message = config.message;
    }

    protected async execute(): Promise<void> {
        console.log(`Displaying popup: ${this.title} - ${this.message}`);

        return new Promise((resolve, reject) => {
            notifier.notify({
                title: this.title,
                message: this.message,
                wait: true // Wait for user action or timeout
            }, (err, response, metadata) => {
                if (err) {
                    console.error('Notification error:', err);
                    reject(err);
                } else {
                    console.log('Notification displayed/interacted with.');
                    resolve();
                }
            });
        });
    }
}
