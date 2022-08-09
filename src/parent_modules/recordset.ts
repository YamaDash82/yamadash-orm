export class Recordset<T> {
  protected _records: T[] = [];
  private _error: Error | null = null;
  private _hasError: boolean = false;

  constructor(
    public source: string
  ) { }

  get records(): T[] {
    return this._records;
  }

  setError(err: Error) {
    this._hasError = true;
    this._error = err;
  }

  get hasError(): boolean {
    return this._hasError;
  }

  get error(): Error | null {
    return this._error;
  }
}