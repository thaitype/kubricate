
export class HashEngine {
  private readonly _known: Record<string, string>;
  private readonly _next: Record<string, string>;

  constructor(initialHashes: Record<string, string> = {}) {
    this._known = { ...initialHashes };
    this._next = {};
  }

  /**
   * Returns true if the content for the filePath has changed compared to known hash.
   */
  public hasChanged(filePath: string, content: string): boolean {
    const currentHash = this.computeHash(content);
    const previousHash = this._known[filePath];

    return currentHash !== previousHash;
  }

  /**
   * Marks the filePath as written with the given content.
   * Always updates the next state hash.
   */
  public markWritten(filePath: string, content: string): void {
    this._next[filePath] = this.computeHash(content);
  }

  /**
   * Returns the updated hash map after generate completes.
   * Use this to persist to `.kubricate/generate.hash.json`.
   */
  public getUpdatedHashes(): Record<string, string> {
    return { ...this._next };
  }

  /**
   * Returns a list of files that were previously tracked but not written this round.
   * Use this to detect stale files.
   */
  public getStaleFiles(): string[] {
    return Object.keys(this._known).filter((key) => !(key in this._next));
  }

  /**
   * Internal: compute SHA-256 hash of content.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected computeHash(content: string): string {
    // Use a dummy implementation here — real one depends on runtime (Node or WebCrypto)
    throw new Error('Hashing not implemented. Inject or override `computeHash()`.');
  }
}
