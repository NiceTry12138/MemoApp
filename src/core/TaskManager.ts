import { BaseTask } from './BaseTask';
import { ScheduledTask } from './ScheduledTask';
import { HttpTask, IHttpTaskConfig } from '../tasks/HttpTask';
import { ExeTask, IExeTaskConfig } from '../tasks/ExeTask';
import { PopupTask, IPopupTaskConfig } from '../tasks/PopupTask';
import { LogTask, ILogTaskConfig } from '../tasks/LogTask';
import { CountdownTask, ICountdownTaskConfig } from '../tasks/CountdownTask';
import { IRepository } from '../persistence/IRepository';
import { JsonFileRepository } from '../persistence/JsonFileRepository';

export type TaskType = 'http' | 'exe' | 'popup' | 'log' | 'countdown';

export interface ITaskDefinition {
    id: string;
    type: TaskType;
    config: IHttpTaskConfig | IExeTaskConfig | IPopupTaskConfig | ILogTaskConfig | ICountdownTaskConfig;
    status: 'running' | 'stopped';
}

export class TaskManager {
    private tasks: Map<string, BaseTask> = new Map();
    private taskDefinitions: Map<string, ITaskDefinition> = new Map();
    private readonly repository: IRepository<ITaskDefinition[]>;

    /**
     * @param repository - Persistence backend. Defaults to a plain JSON file
     *                     so existing behaviour is preserved. Pass a different
     *                     IRepository implementation to change the storage
     *                     strategy (encrypted file, SQLite, remote DB, …).
     */
    constructor(repository?: IRepository<ITaskDefinition[]>) {
        this.repository = repository ?? new JsonFileRepository<ITaskDefinition[]>('tasks.json');
        this.loadTasks();
    }

    private loadTasks(): void {
        const definitions = this.repository.load();
        if (!definitions) return;

        definitions.forEach(def => {
            let task: BaseTask;
            try {
                switch (def.type) {
                    case 'http':
                        task = new HttpTask(def.config as IHttpTaskConfig);
                        break;
                    case 'exe':
                        task = new ExeTask(def.config as IExeTaskConfig);
                        break;
                    case 'popup':
                        task = new PopupTask(def.config as IPopupTaskConfig);
                        break;
                    case 'log':
                        task = new LogTask(def.config as ILogTaskConfig);
                        break;
                    case 'countdown':
                        task = new CountdownTask(def.config as ICountdownTaskConfig);
                        break;
                    default:
                        console.warn(`Unknown task type in saved data: ${(def as any).type}`);
                        return;
                }
            } catch (err) {
                console.error(`Error reconstructing task ${def.id}:`, err);
                return;
            }

            this.tasks.set(def.id, task);
            this.taskDefinitions.set(def.id, def);

            // Auto-resume running tasks
            if (def.status === 'running' && (task instanceof ScheduledTask || task instanceof CountdownTask)) {
                console.log(`Resuming task: ${def.config.name} (${def.id})`);
                (task as any).start();
            }
        });

        console.log(`Loaded ${this.tasks.size} tasks.`);
    }

    private saveTasks(): void {
        const definitions = Array.from(this.taskDefinitions.values());
        this.repository.save(definitions);
        console.log('Tasks saved.');
    }

    public createTask(type: TaskType, config: any): string {
        const id = config.id || `task-${Date.now()}`;
        config.id = id;

        let task: BaseTask;
        switch (type) {
            case 'http':   task = new HttpTask(config as IHttpTaskConfig); break;
            case 'exe':    task = new ExeTask(config as IExeTaskConfig); break;
            case 'popup':  task = new PopupTask(config as IPopupTaskConfig); break;
            case 'log':    task = new LogTask(config as ILogTaskConfig); break;
            case 'countdown': task = new CountdownTask(config as ICountdownTaskConfig); break;
            default: throw new Error(`Unknown task type: ${type}`);
        }

        this.tasks.set(id, task);
        this.taskDefinitions.set(id, { id, type, config, status: 'stopped' });

        console.log(`Task created: [${type}] ${config.name} (${id})`);
        this.saveTasks();
        return id;
    }

    public startTask(id: string): boolean {
        const task = this.tasks.get(id);
        if (task && (task instanceof ScheduledTask || task instanceof CountdownTask)) {
            (task as any).start();
            const def = this.taskDefinitions.get(id);
            if (def) { def.status = 'running'; this.saveTasks(); }
            return true;
        }
        return false;
    }

    public stopTask(id: string): boolean {
        const task = this.tasks.get(id);
        if (task && (task instanceof ScheduledTask || task instanceof CountdownTask)) {
            (task as any).stop();
            const def = this.taskDefinitions.get(id);
            if (def) { def.status = 'stopped'; this.saveTasks(); }
            return true;
        }
        return false;
    }

    public updateTask(id: string, type: TaskType, config: any): boolean {
        if (!this.tasks.has(id)) return false;

        this.stopTask(id);
        config.id = id;

        let task: BaseTask;
        try {
            switch (type) {
                case 'http':   task = new HttpTask(config as IHttpTaskConfig); break;
                case 'exe':    task = new ExeTask(config as IExeTaskConfig); break;
                case 'popup':  task = new PopupTask(config as IPopupTaskConfig); break;
                case 'log':    task = new LogTask(config as ILogTaskConfig); break;
                case 'countdown': task = new CountdownTask(config as ICountdownTaskConfig); break;
                default: throw new Error(`Unknown task type: ${type}`);
            }
        } catch (e) {
            console.error(`Failed to update task ${id}:`, e);
            return false;
        }

        this.tasks.set(id, task);
        this.taskDefinitions.set(id, { id, type, config, status: 'stopped' });
        this.saveTasks();
        return true;
    }

    public deleteTask(id: string): boolean {
        this.stopTask(id);
        this.tasks.delete(id);
        this.taskDefinitions.delete(id);
        this.saveTasks();
        return true;
    }

    public getAllTasks(): any[] {
        return Array.from(this.taskDefinitions.values()).map(def => {
            const task = this.tasks.get(def.id);
            let nextRun = null;
            if (task instanceof ScheduledTask) {
                nextRun = task.getNextInvocation();
            }
            return {
                ...def,
                nextExecution: nextRun ? nextRun.toLocaleString() : 'Not Scheduled'
            };
        });
    }
}
