export const SQL_TRANSACTION_STATE = {
  //実行待ち
  WaitingForExecute: "WaitingForExecute", 
  //成功
  Succeed: "Succeed", 
  //失敗
  Failed: "Failed"
} as const;

export type SQLTransactionState = typeof SQL_TRANSACTION_STATE[keyof typeof SQL_TRANSACTION_STATE];

export abstract class AbstractTransactionSet {
  abstract execute(): Promise<boolean>;
  abstract get error(): any;
}

export class SQLCommand {
  private _source: string;
  private _state: SQLTransactionState = SQL_TRANSACTION_STATE.WaitingForExecute;
  private _error: Error | null = null;

  constructor(source: string) {
    this._source = source;
  }

  get source(): string {
    return this._source;
  }

  setState(state: SQLTransactionState) {
    this._state = state;
  }

  get state(): SQLTransactionState {
    return this._state;
  }

  setError(err: Error) {
    this._error = err;
  }

  get error(): Error | null {
    return this._error;
  }
}

/*
//SQLCommandクラス
//実行するSQLCOmmandを保持する。
export class SQLCommand {
  //コマンド実行状態
  private _state: SQLTransactionState;
  //エラー
  private _error: Error | null;

  constructor (public readonly source: string) {

  }

  setState(state: SQLTransactionState) {
    this._state = state;
  }

  get state(): SQLTransactionState {
    return this._state;
  }

  setError(error: Error) {
    this._error = error;
  }

  get error(): Error | null {
    return this._error;
  }
}
*/