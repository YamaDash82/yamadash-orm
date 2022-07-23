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

  overWriteRecords(records: T[]) {
    this._records = records;
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

  toJSON(): { 
    source: string, 
    records: any[], 
    hasError: boolean, 
    error: string
  } {
    return {
      source: this.source, 
      records: this.records, 
      hasError: this.hasError, 
      error: this._error ? (this._error instanceof Error ? this._error.message : "Recordsetで想定外のエラー発生。") : ""
    }
  }

  static parse(obj: any): Recordset<any> {
    if(!obj) throw new Error('Recordsetクラスのインスタンスの復元に失敗しました。');
    
    if(!("source" in obj)) throw new Error('Recordsetクラスのインスタンスの復元に失敗しました。sourceプロパティが有りません。');
    if(typeof obj.source !== "string") throw new Error('Recordsetクラスのインスタンスの復元に失敗しました。sourceプロパティの型がstring以外の型です。');
    
    if(!("records" in obj)) throw new Error('Recordsetクラスのインスタンスの復元に失敗しました。recordsプロパティが有りません。');
    if(!Array.isArray(obj.records)) throw new Error('Recordsetクラスのインスタンスの復元に失敗しました。recordsプロパティの型が配列ではありません。');
    
    if(!("hasError" in obj)) throw new Error('Recordsetクラスのインスタンスの復元に失敗しました。hasErrorプロパティが有りません。');
    if(typeof obj.hasError !== "boolean") throw new Error('Recordsetクラスのインスタンスの復元に失敗しました。hasErrorプロパティの型がboolean以外の型です。');

    if(!("error" in obj)) throw new Error('Recordsetクラスのインスタンスの復元に失敗しました。errorプロパティが有りません。');
    if(typeof obj.error !== "string") throw new Error('Recordsetクラスのインスタンスの復元に失敗しました。errorプロパティの型がstring以外の型です。');
    
    const rst = new Recordset(obj.source);
    rst.records.push(...obj.records);
    if(obj.error) {
      rst.setError(new Error(obj.error));
    }

    return rst;
  }
}