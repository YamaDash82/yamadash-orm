import { PostgresRecordsetFiller, PostgresConnection, Recordset } from '../index';
import { config } from 'dotenv';

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

    const conn = new PostgresConnection();
    await conn.connect();

    const recordset = new Recordset<{ user_name: string, age: number}>(`select '${userName}' as user_name, ${age} as age`);
    const filler = new PostgresRecordsetFiller(conn, recordset);

    await filler.fill();
    await conn.end();

    expect(recordset.records[0].user_name).toEqual(userName);
    expect(recordset.records[0].age).toEqual(age);
  });

  it(`誤ったSQL文を指定。errorが格納されるかテストする。`, async () => {
    //FROMを誤ってFRMと記述した。
    const rst = new Recordset (`SELECT * FRM users`);
    
    const filler = new PostgresRecordsetFiller(rst);
    try {
      await filler.fill();
    } catch(err) {
      console.log(`エラー内容:${err}`)
      //スローされたエラーと、rstに格納されているエラーが同じである。
      expect(rst.error === err).toBe(true);
    }

    expect(rst.hasError).toBe(true);
    expect(rst.error).toBeTruthy();
  });
});