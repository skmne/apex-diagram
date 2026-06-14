import type { Memento } from "vscode";

class MemoryMemento implements Memento {
	private readonly values = new Map<string, unknown>();

	public get<T>(key: string): T | undefined;
	public get<T>(key: string, defaultValue: T): T;
	public get<T>(key: string, defaultValue?: T): T | undefined {
		return this.values.has(key) ? this.values.get(key) as T : defaultValue;
	}

	public async update(key: string, value: unknown): Promise<void> {
		if (value === undefined) {
			this.values.delete(key);
			return;
		}

		this.values.set(key, value);
	}

	public keys(): readonly string[] {
		return [...this.values.keys()];
	}
}

export { MemoryMemento };
