import { Recordset } from '../parent_modules/recordset';
import { PostgresRecordsetFiller } from '../index';
import { config } from 'dotenv';
import { DefaultPool } from '../index';

describe('RecordsetFillerのテスト', () => {
  //接続情報を取得する。
  config();

  it('Recordsetを介してdbからデータを取得', async () => {
    const userName = 'Jhon Smith';
    const age = 39;
    let gotUserName = '';
    let gotAge = age - age;

    try {
      const recordset = new Recordset<{ user_name: string, age: number}>(`select '${userName}' as user_name, ${age} as age`);

      const filler = new PostgresRecordsetFiller(recordset);

      await filler.fill();

      gotUserName = recordset.records[0].user_name;
      gotAge = recordset.records[0].age;
    } catch (err) {
      console.log(`エラー:${err instanceof Error ? err.message : ''}`);
    }
    
    expect(gotUserName).toEqual('Jhon Smith');
    expect(gotAge).toEqual(age);
  });

  it(`別にpoolを生成してdbからデータを取得する。`, async () => {
    const userName = '山田　太郎';
    const age = 39;

    const pool = new DefaultPool();
    
    const recordset = new Recordset<{ user_name: string, age: number}>(`select '${userName}' as user_name, ${age} as age`);
    const filler = new PostgresRecordsetFiller(pool, recordset);

    await filler.fill();

    expect(recordset.records[0].user_name).toEqual(userName);
    expect(recordset.records[0].age).toEqual(age);
  });
});