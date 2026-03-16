import { clipboard, nativeImage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface ClipboardEntry {
    id: string;
    type: 'text' | 'image';
    text?: string;          // For text entries
    imageDataUrl?: string;  // For image entries (base64 data URL)
    timestamp: number;
    preview: string;        // Short preview text for display
}

export class ClipboardManager {
    private history: ClipboardEntry[] = [];
    private lastText: string = '';
    private lastImageHash: string = '';
    private timer: ReturnType<typeof setInterval> | null = null;
    private ignoreNext: boolean = false;
    private readonly MAX_HISTORY = 50;
    private readonly SAVE_FILE: string;

    constructor() {
        this.SAVE_FILE = path.join(process.cwd(), 'clipboard_history.json');
        this.loadHistory();

        // Initialize with current clipboard content so we don't record it as "new"
        this.lastText = clipboard.readText() || '';
        const img = clipboard.readImage();
        if (img && !img.isEmpty()) {
            this.lastImageHash = this.hashImage(img);
        }
    }

    /** Start monitoring clipboard at interval */
    public startMonitoring(intervalMs: number = 500): void {
        if (this.timer) return;
        this.timer = setInterval(() => this.poll(), intervalMs);
        console.log('Clipboard monitoring started.');
    }

    public stopMonitoring(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log('Clipboard monitoring stopped.');
        }
    }

    /** Set flag to ignore the next clipboard change (used when we write to clipboard ourselves) */
    public setIgnoreNext(): void {
        this.ignoreNext = true;
    }

    /** Write text to clipboard without recording it */
    public copyToClipboard(id: string): boolean {
        const entry = this.history.find(e => e.id === id);
        if (!entry) return false;

        this.setIgnoreNext();
        if (entry.type === 'text' && entry.text) {
            clipboard.writeText(entry.text);
        } else if (entry.type === 'image' && entry.imageDataUrl) {
            const img = nativeImage.createFromDataURL(entry.imageDataUrl);
            clipboard.writeImage(img);
        }
        return true;
    }

    /** Delete an entry from history */
    public deleteEntry(id: string): boolean {
        const idx = this.history.findIndex(e => e.id === id);
        if (idx === -1) return false;
        this.history.splice(idx, 1);
        this.saveHistory();
        return true;
    }

    /** Clear all history */
    public clearHistory(): void {
        this.history = [];
        this.saveHistory();
    }

    /** Get all history entries (newest first) */
    public getHistory(): ClipboardEntry[] {
        return [...this.history];
    }

    // --- Private Methods ---

    private poll(): void {
        // Check if we should ignore this change (we just wrote to clipboard ourselves)
        if (this.ignoreNext) {
            // Update tracked values so the next poll doesn't see our write as "new"
            this.lastText = clipboard.readText() || '';
            const img = clipboard.readImage();
            this.lastImageHash = (img && !img.isEmpty()) ? this.hashImage(img) : '';
            this.ignoreNext = false;
            return;
        }

        // Check for new text content
        const currentText = clipboard.readText() || '';
        
        // Check for new image content
        const currentImage = clipboard.readImage();
        const hasImage = currentImage && !currentImage.isEmpty();
        const currentImageHash = hasImage ? this.hashImage(currentImage!) : '';

        // Detect image change (prioritize image if both changed)
        if (hasImage && currentImageHash !== this.lastImageHash && currentImageHash !== '') {
            this.lastImageHash = currentImageHash;
            this.lastText = currentText; // Also update text tracker

            // Create image entry
            const dataUrl = currentImage!.toDataURL();
            const size = currentImage!.getSize();
            this.addEntry({
                id: `cb-${Date.now()}`,
                type: 'image',
                imageDataUrl: dataUrl,
                timestamp: Date.now(),
                preview: `[图片 ${size.width}×${size.height}]`
            });
            return;
        }

        // Detect text change
        if (currentText && currentText !== this.lastText) {
            this.lastText = currentText;
            this.lastImageHash = currentImageHash; // Also update image tracker

            // Don't record empty or whitespace-only text
            if (currentText.trim().length === 0) return;

            this.addEntry({
                id: `cb-${Date.now()}`,
                type: 'text',
                text: currentText,
                timestamp: Date.now(),
                preview: currentText.length > 100 ? currentText.substring(0, 100) + '...' : currentText
            });
        }
    }

    private addEntry(entry: ClipboardEntry): void {
        // Remove duplicate text entries
        if (entry.type === 'text') {
            this.history = this.history.filter(e => !(e.type === 'text' && e.text === entry.text));
        }

        // Add to front (newest first)
        this.history.unshift(entry);

        // Trim to max
        if (this.history.length > this.MAX_HISTORY) {
            this.history = this.history.slice(0, this.MAX_HISTORY);
        }

        this.saveHistory();
    }

    private hashImage(img: Electron.NativeImage): string {
        // Use a simple hash of the PNG buffer size + first bytes for fast comparison
        const buf = img.toPNG();
        if (buf.length === 0) return '';
        // Simple hash: size + first 64 bytes content
        const sample = buf.slice(0, Math.min(64, buf.length));
        return `${buf.length}-${Array.from(sample).reduce((a, b) => ((a << 5) - a + b) | 0, 0)}`;
    }

    private loadHistory(): void {
        try {
            if (fs.existsSync(this.SAVE_FILE)) {
                const data = fs.readFileSync(this.SAVE_FILE, 'utf-8');
                this.history = JSON.parse(data);
                console.log(`Loaded ${this.history.length} clipboard entries.`);
            }
        } catch (e) {
            console.error('Failed to load clipboard history:', e);
            this.history = [];
        }
    }

    private saveHistory(): void {
        try {
            fs.writeFileSync(this.SAVE_FILE, JSON.stringify(this.history, null, 2));
        } catch (e) {
            console.error('Failed to save clipboard history:', e);
        }
    }
}
