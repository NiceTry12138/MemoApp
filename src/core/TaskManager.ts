import * as fs from 'fs';
import * as path from 'path';
import { BaseTask } from './BaseTask';
import { ScheduledTask } from './ScheduledTask';
import { HttpTask, IHttpTaskConfig } from '../tasks/HttpTask';
import { ExeTask, IExeTaskConfig } from '../tasks/ExeTask';
import { PopupTask, IPopupTaskConfig } from '../tasks/PopupTask';
import { LogTask, ILogTaskConfig } from '../tasks/LogTask';

export type TaskType = 'http' | 'exe' | 'popup' | 'log';

export interface ITaskDefinition {
    id: string;
    type: TaskType;
    config: IHttpTaskConfig | IExeTaskConfig | IPopupTaskConfig | ILogTaskConfig;
    status: 'running' | 'stopped';
}

export class TaskManager {
    private tasks: Map<string, BaseTask> = new Map();
    private taskDefinitions: Map<string, ITaskDefinition> = new Map();
    private readonly SAVE_FILE = path.join(process.cwd(), 'tasks.json');

    constructor() {
        this.loadTasks();
    }

    private loadTasks() {
        if (!fs.existsSync(this.SAVE_FILE)) return;
        
        try {
            const data = fs.readFileSync(this.SAVE_FILE, 'utf-8');
            const definitions: ITaskDefinition[] = JSON.parse(data);
            
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
                        default: 
                            console.warn(`Unknown task type in saved file: ${def.type}`);
                            return;
                    }
                } catch (err) {
                    console.error(`Error reconstructing task ${def.id}:`, err);
                    return;
                }

                this.tasks.set(def.id, task);
                this.taskDefinitions.set(def.id, def);

                // Auto-resume running tasks (only if they are ScheduledTasks)
                if (def.status === 'running' && task instanceof ScheduledTask) {
                    console.log(`Resuming task: ${def.config.name} (${def.id})`);
                    task.start();
                }
            });
            
            console.log(`Loaded ${this.tasks.size} tasks from ${this.SAVE_FILE}`);
        } catch (e) {
            console.error('Failed to load tasks from disk:', e);
        }
    }

    private saveTasks() {
        const definitions = Array.from(this.taskDefinitions.values());
        try {
            fs.writeFileSync(this.SAVE_FILE, JSON.stringify(definitions, null, 2));
            console.log('Tasks saved to disk.');
        } catch (e) {
            console.error('Failed to save tasks:', e);
        }
    }

    public createTask(type: TaskType, config: any): string {
        const id = config.id || `task-${Date.now()}`;
        config.id = id;

        let task: BaseTask;

        switch (type) {
            case 'http':
                task = new HttpTask(config as IHttpTaskConfig);
                break;
            case 'exe':
                task = new ExeTask(config as IExeTaskConfig);
                break;
            case 'popup':
                task = new PopupTask(config as IPopupTaskConfig);
                break;
            case 'log':
                task = new LogTask(config as ILogTaskConfig);
                break;
            default:
                throw new Error(`Unknown task type: ${type}`);
        }

        this.tasks.set(id, task);
        this.taskDefinitions.set(id, {
            id,
            type,
            config,
            status: 'stopped'
        });

        console.log(`Task created: [${type}] ${config.name} (${id})`);
        this.saveTasks();
        return id;
    }

    public startTask(id: string): boolean {
        const task = this.tasks.get(id);
        if (task && task instanceof ScheduledTask) {
            task.start();
            const def = this.taskDefinitions.get(id);
            if (def) {
                def.status = 'running';
                this.saveTasks();
            }
            return true;
        }
        return false;
    }

    public stopTask(id: string): boolean {
        const task = this.tasks.get(id);
        if (task && task instanceof ScheduledTask) {
            task.stop();
            const def = this.taskDefinitions.get(id);
            if (def) {
                def.status = 'stopped';
                this.saveTasks();
            }
            return true;
        }
        return false;
    }

    public updateTask(id: string, type: TaskType, config: any): boolean {
        // 1. Check if exists
        if (!this.tasks.has(id)) return false;

        // 2. Stop existing task
        this.stopTask(id);

        // 3. Update config (preserve ID)
        config.id = id;

        // 4. Re-create instance
        let task: BaseTask;
        try {
            switch (type) {
                case 'http':
                    task = new HttpTask(config as IHttpTaskConfig);
                    break;
                case 'exe':
                    task = new ExeTask(config as IExeTaskConfig);
                    break;
                case 'popup':
                    task = new PopupTask(config as IPopupTaskConfig);
                    break;
                case 'log':
                    task = new LogTask(config as ILogTaskConfig);
                    break;
                default:
                    throw new Error(`Unknown task type: ${type}`);
            }
        } catch (e) { 
            console.error(`Failed to update task ${id}:`, e);
            return false; 
        }

        // 5. Update maps
        this.tasks.set(id, task);
        this.taskDefinitions.set(id, {
            id,
            type,
            config,
            status: 'stopped' // Reset to stopped after edit
        });

        this.saveTasks();
        return true;
    }

    public deleteTask(id: string): boolean {
        // Stop if it's running
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
