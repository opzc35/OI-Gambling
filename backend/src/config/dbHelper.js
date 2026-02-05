const db = require('./database');

// 将 SQLite 的同步操作包装成 Promise，提供类似 pg 的接口
class DatabaseHelper {
  // 执行查询并返回所有结果
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = db.prepare(sql);
        const rows = stmt.all(...params);
        resolve({ rows, rowCount: rows.length });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 执行查询并返回单行结果
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = db.prepare(sql);
        const row = stmt.get(...params);
        resolve(row);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 执行插入/更新/删除操作
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = db.prepare(sql);
        const info = stmt.run(...params);
        resolve({
          lastID: info.lastInsertRowid,
          changes: info.changes,
          rowCount: info.changes
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 事务支持
  transaction(callback) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(callback);
      try {
        const result = transaction();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 获取连接（用于事务）
  connect() {
    return Promise.resolve({
      query: this.query.bind(this),
      get: this.get.bind(this),
      run: this.run.bind(this),
      release: () => {},
    });
  }
}

module.exports = new DatabaseHelper();
