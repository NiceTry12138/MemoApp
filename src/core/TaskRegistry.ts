import { BaseTask } from './BaseTask';

// Type alias for task constructors
export type ITaskConstructor = new (config: any) => BaseTask;

/**
 * Main-process singleton registry.
 * Each task file calls TaskRegistry.register() at module load time,
 * so TaskManager never needs a switch statement.
 */
class TaskRegistryManager {
    private readonly map = new Map<string, ITaskConstructor>();

    /** Called once per task type at module load time. */
    register(type: string, ctor: ITaskConstructor): void {
        if (this.map.has(type)) {
            console.warn(`[TaskRegistry] Type "${type}" is already registered. Overwriting.`);
        }
        this.map.set(type, ctor);
        console.log(`[TaskRegistry] Registered task type: "${type}"`);
    }

    /** Instantiate a task by type string. Throws if type is unknown. */
    create(type: string, config: any): BaseTask {
        const ctor = this.map.get(type);
        if (!ctor) throw new Error(`[TaskRegistry] Unknown task type: "${type}"`);
        return new ctor(config);
    }

    /** Returns true if the given type has been registered. */
    has(type: string): boolean {
        return this.map.has(type);
    }

    /** All registered type strings, in registration order. */
    getAllTypes(): string[] {
        return [...this.map.keys()];
    }
}

export const TaskRegistry = new TaskRegistryManager();
