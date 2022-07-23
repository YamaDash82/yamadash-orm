import { SQLCommand } from "./transaction-set";

export const SQL_SYMPLE_COLUMN_TYPES = {
  number: 'number', 
  text: 'text', 
  dateTime: 'dateTime'
} as const;
export type SQLSympleColumnTypes = typeof SQL_SYMPLE_COLUMN_TYPES[keyof typeof SQL_SYMPLE_COLUMN_TYPES];

export type ColumnInformation = {
  name: string;
  colType: SQLSympleColumnTypes;
  isPrimaryKey: boolean;
  nullable: boolean;
}

export namespace BaseTable {
  export class AbstractFields implements Iterable<ColumnInformation> {
    [Symbol.iterator]() {
      const targets: any[] = [];

      for(let prop in this) {
        if(this.isColumnInformation(this[prop])) {
          targets.push(this[prop]);
        }
      }

      let pointer = 0;

      return {
        next(): IteratorResult<ColumnInformation>{
          if(pointer < targets.length) {
            return {
              done: false,
              value: targets[pointer++]
            };
          } else {
            return {
              done: true, 
              value: null
            };
          }
        }
      }
    }

    isColumnInformation(arg: any): arg is ColumnInformation {
      return !!arg && 
        "name" in arg &&
        typeof arg.name === "string" &&
        "colType" in arg &&
        typeof arg.colType === "string" &&
        "isPrimaryKey" in arg &&
        typeof arg.isPrimaryKey === "boolean" &&
        "nullable" in arg &&
        typeof arg.nullable === "boolean"
    }
  }

  export abstract class AbstratTable {
    protected abstract _tableName: string;
    protected abstract _dbo: string;
    abstract fields: AbstractFields;
    protected rows: {[key: string]: any}[] = [];

    //新規行取得処理
    getNewRow(): {[key: string]: any} {
      let row: {[key: string]: any} = {};

      for(let column of this.fields) {
        row[column.name] = null;
      }

      return row;
    }

    //新規行追加
    appendRow(row: {[key: string]: any}) {
      this.rows.push(row);
    }

    //挿入SQL生成処理
    generateInsertSQLCommand(): SQLCommand {
      //INSERT INTO テーブル名 (フィールド1, フィールド2...)
      //                       |<-- この部分の生成    -->| 
      let fields = "";
      for(let field of this.fields) {
        if(fields) {
          fields += ", "
        }
        fields += `[${field.name}]`;
      }

      //VALUES以下の生成
      const valueStrs: string[] = [];
      this.rows.forEach(row => {
        let valuesStr = "";

        for(let field of this.fields){
          if(valuesStr) {
            valuesStr += ", ";
          }

          if(row[field.name]){
            if(field.colType === SQL_SYMPLE_COLUMN_TYPES.text) {
              //文字列 シングルコーテーションでくくる必要がある。
              valuesStr += `'${row[field.name]}'`;
            } else if(field.colType === SQL_SYMPLE_COLUMN_TYPES.dateTime) {
              //日付型
              valuesStr += `'row[field.name]'`;
            } else {
              //数値型 シングルコーテーションでくくる必要がない。
              valuesStr += `${row[field.name]}`;
            }
          } else {
            valuesStr += "null";
          }
        }

        /** セットされる値のイメージ
         * [
         *   (val1, val2...), 
         *   (val1, val2...),
         *   ... 
         * ]
         */
        valueStrs.push(`(${valuesStr})`);
      });

      const source = `INSERT INTO [${this._dbo}].dbo.[${this._tableName}] (${fields}) VALUES ${valueStrs.join(",")}`;
      return new SQLCommand(source);
    }
  }
}