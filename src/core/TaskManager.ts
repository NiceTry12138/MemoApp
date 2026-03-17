import { BaseTask } from './BaseTask';
import { ScheduledTask } from './ScheduledTask';
import { CountdownTask } from '../tasks/CountdownTask';
import { TaskRegistry } from './TaskRegistry';
import { AppStore } from '../persistence/AppStore';
import { ITaskDefinition } from './types';

// Re-export for backward compatibility (main.ts imports this type)
export { ITaskDefinition } from './types';

export class TaskManager {
    private tasks: Map<string, BaseTask> = new Map();
    private taskDefinitions: Map<string, ITaskDefinition> = new Map();
    private readonly store: AppStore;

    constructor(store: AppStore) {
        this.store = store;
        this.loadTasks();
    }

    private loadTasks(): void {
        const definitions = this.store.getTasks();
        if (!definitions || definitions.length === 0) return;

        definitions.forEach(def => {
            if (!TaskRegistry.has(def.type)) {
                console.warn(`[TaskManager] Unknown task type "${def.type}" — skipping.`);
                return;
            }
            let task: BaseTask;
            try {
                task = TaskRegistry.create(def.type, def.config);
            } catch (err) {
                console.error(`[TaskManager] Failed to reconstruct task ${def.id}:`, err);
                return;
            }

            this.tasks.set(def.id, task);
            this.taskDefinitions.set(def.id, def);

            if (def.status === 'running' && (task instanceof ScheduledTask || task instanceof CountdownTask)) {
                console.log(`Resuming task: ${def.config.name} (${def.id})`);
                (task as any).start();
            }
        });

        console.log(`Loaded ${this.tasks.size} tasks.`);
    }

    private saveTasks(): void {
        this.store.saveTasks(Array.from(this.taskDefinitions.values()));
    }

    public createTask(type: string, config: any): string {
        if (!TaskRegistry.has(type)) throw new Error(`Unknown task type: "${type}"`);

        const id = config.id || `task-${Date.now()}`;
        config.id = id;

        const task = TaskRegistry.create(type, config);
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

    public updateTask(id: string, type: string, config: any): boolean {
        if (!this.tasks.has(id)) return false;
        if (!TaskRegistry.has(type)) return false;

        this.stopTask(id);
        config.id = id;

        let task: BaseTask;
        try {
            task = TaskRegistry.create(type, config);
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
