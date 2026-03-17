/**
 * Descriptor for a task type's UI in the renderer process.
 * All code here must be browser-safe (no Node.js APIs).
 */
export interface ITaskWidgetDescriptor {
    /** Display label for the task-type dropdown (e.g. "🌐 HTTP 请求"). */
    label: string;

    /**
     * HTML string for the type-specific configuration fields.
     * Rendered inside #config-fields when this task type is selected.
     */
    template: string;

    /**
     * Reads the current form values and returns a partial config object
     * containing only this task type's specific fields.
     * Called during createTask() and updateTask().
     */
    readConfig: () => Record<string, any>;

    /**
     * Populates the form fields from an existing config object.
     * Called when opening the edit modal for an existing task.
     */
    fillConfig: (config: Record<string, any>) => void;
}

/**
 * Renderer-process singleton registry.
 * Each widget file calls TaskWidgetManager.register() at module load time.
 * renderer.ts uses this registry instead of CONFIG_TEMPLATES / if-else chains.
 */
class TaskWidgetManagerClass {
    private readonly map = new Map<string, ITaskWidgetDescriptor>();

    /** Called once per task type at module load time. */
    register(type: string, descriptor: ITaskWidgetDescriptor): void {
        this.map.set(type, descriptor);
    }

    /** Returns the UI descriptor for a given type, or undefined. */
    get(type: string): ITaskWidgetDescriptor | undefined {
        return this.map.get(type);
    }

    /** All entries as [type, descriptor] pairs, in registration order. */
    getAll(): [string, ITaskWidgetDescriptor][] {
        return [...this.map.entries()];
    }
}

export const TaskWidgetManager = new TaskWidgetManagerClass();
