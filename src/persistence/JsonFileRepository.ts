import * as fs from 'fs';
import * as path from 'path';
import { IRepository } from './IRepository';

/**
 * Plain-text JSON file implementation of IRepository<T>.
 *
 * Data is stored as pretty-printed JSON so it can be inspected or edited
 * manually. This is the default implementation used during development and
 * can be replaced by an encrypted or database-backed implementation later
 * without any changes to the business logic.
 */
export class JsonFileRepository<T> implements IRepository<T> {
    private readonly filePath: string;

    /**
     * @param fileName - File name (or absolute path) for the JSON store.
     *                   If a bare name is given it is resolved relative to
     *                   process.cwd() so the behaviour matches the original
     *                   hard-coded paths.
     */
    constructor(fileName: string) {
        this.filePath = path.isAbsolute(fileName)
            ? fileName
            : path.join(process.cwd(), fileName);
    }

    /** Read and deserialise the JSON file. Returns null on any failure. */
    load(): T | null {
        try {
            if (!fs.existsSync(this.filePath)) return null;
            const raw = fs.readFileSync(this.filePath, 'utf-8');
            return JSON.parse(raw) as T;
        } catch (err) {
            console.error(`[JsonFileRepository] Failed to load "${this.filePath}":`, err);
            return null;
        }
    }

    /** Serialise and write data to the JSON file synchronously. */
    save(data: T): void {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (err) {
            console.error(`[JsonFileRepository] Failed to save "${this.filePath}":`, err);
        }
    }
}
