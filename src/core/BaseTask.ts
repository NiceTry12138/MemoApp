export interface ITaskConfig {
    id: string;
    name: string;
    description?: string; // For LogTask or general notes
    startDate?: string;   // ISO Date String
    endDate?: string;     // ISO Date String
}

export abstract class BaseTask {
    public id: string;
    public name: string;
    public description: string;
    public startDate: Date | null;
    public endDate: Date | null;

    constructor(config: ITaskConfig) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description || '';
        this.startDate = config.startDate ? new Date(config.startDate) : null;
        this.endDate = config.endDate ? new Date(config.endDate) : null;
    }
}
