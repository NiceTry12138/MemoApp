import axios, { Method, AxiosRequestConfig } from 'axios';
import { ScheduledTask, IScheduledTaskConfig } from '../core/ScheduledTask';

export interface IHttpTaskConfig extends IScheduledTaskConfig {
    url: string;
    method: Method;
    headers?: Record<string, string>;
    body?: any;
    cookies?: Record<string, string>;
}

export class HttpTask extends ScheduledTask {
    private url: string;
    private method: Method;
    private headers: Record<string, string>;
    private body: any;
    private cookies: Record<string, string>;

    constructor(config: IHttpTaskConfig) {
        super(config);
        this.url = config.url;
        this.method = config.method;
        this.headers = config.headers || {};
        this.body = config.body;
        this.cookies = config.cookies || {};
    }

    protected async execute(): Promise<void> {
        console.log(`Sending HTTP ${this.method} request to ${this.url}`);

        const requestConfig: AxiosRequestConfig = {
            method: this.method,
            url: this.url,
            headers: { ...this.headers },
            data: this.body,
        };

        // Add cookies to headers if present
        if (Object.keys(this.cookies).length > 0) {
            const cookieString = Object.entries(this.cookies)
                .map(([key, value]) => `${key}=${value}`)
                .join('; ');
            requestConfig.headers = requestConfig.headers || {};
            requestConfig.headers['Cookie'] = cookieString;
        }

        try {
            const response = await axios(requestConfig);
            console.log(`HTTP Task Response Status: ${response.status}`);
            // console.log('Response Data:', response.data); // Optional: log data
        } catch (error: any) {
            console.error(`HTTP Request failed: ${error.message}`);
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error(`Data:`, error.response.data);
            }
            throw error; // Re-throw to be caught by BaseTask
        }
    }
}
