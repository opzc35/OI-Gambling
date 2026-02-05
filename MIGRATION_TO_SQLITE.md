# PostgreSQL 到 SQLite 迁移总结

## 迁移概述

项目已成功从 PostgreSQL 迁移到 SQLite，以简化部署和开发流程。

## 主要变更

### 1. 依赖变更

**之前 (PostgreSQL):**
```json
"pg": "^8.18.0"
```

**现在 (SQLite):**
```json
"better-sqlite3": "^11.8.1"
```

### 2. 数据库配置

**文件:** `backend/src/config/database.js`

- 从异步的 `pg.Pool` 改为同步的 `better-sqlite3`
- 启用 WAL 模式提升性能
- 启用外键约束

### 3. 数据库 Schema 变更

**文件:** `backend/src/config/database.sql`

主要语法变更：
- `SERIAL PRIMARY KEY` → `INTEGER PRIMARY KEY AUTOINCREMENT`
- `DECIMAL(10,2)` → `REAL`
- `TIMESTAMP` → `DATETIME`
- `TEXT[]` (数组) → `TEXT` (存储为 JSON 字符串)
- `BOOLEAN` → `BOOLEAN` (SQLite 使用 0/1)
- `true/false` → `1/0`
- 添加 `IF NOT EXISTS` 子句

### 4. 查询语法变更

**占位符:**
- PostgreSQL: `$1, $2, $3...`
- SQLite: `?, ?, ?...`

**RETURNING 子句:**
- PostgreSQL: `INSERT ... RETURNING *`
- SQLite: 使用 `lastInsertRowid` 获取插入的 ID，然后单独查询

**布尔值:**
- PostgreSQL: `WHERE is_active = true`
- SQLite: `WHERE is_active = 1`

### 5. 数组类型处理

PostgreSQL 原生支持数组类型 (`TEXT[]`)，SQLite 不支持。

**解决方案:** 使用 JSON 字符串存储

**示例:**
```javascript
// 存储
const tags = ['dp', 'greedy', 'math'];
await pool.run('INSERT INTO game_rounds (problem_tags) VALUES (?)', 
  [JSON.stringify(tags)]);

// 读取
const round = await pool.get('SELECT * FROM game_rounds WHERE id = ?', [id]);
round.problem_tags = JSON.parse(round.problem_tags || '[]');
```

### 6. 事务处理

**PostgreSQL (异步):**
```javascript
const client = await pool.connect();
await client.query('BEGIN');
// ... 操作
await client.query('COMMIT');
client.release();
```

**SQLite (同步):**
```javascript
const transaction = db.transaction(() => {
  // ... 操作
});
transaction();
```

### 7. 数据库工具类

创建了 `backend/src/config/dbHelper.js` 来封装 SQLite 操作，提供类似 pg 的异步接口：

- `query(sql, params)` - 查询多行
- `get(sql, params)` - 查询单行
- `run(sql, params)` - 执行插入/更新/删除

### 8. 环境变量

**之前:**
```
DATABASE_URL=postgresql://username:password@localhost:5432/oi_gambling
```

**现在:**
```
DATABASE_PATH=./database.sqlite
```

## 修改的文件列表

### 配置文件
- `backend/package.json` - 依赖更新
- `backend/.env` - 环境变量
- `backend/.env.example` - 环境变量示例
- `backend/src/config/database.js` - 数据库连接
- `backend/src/config/database.sql` - Schema 定义
- `backend/src/config/dbHelper.js` - **新增** 数据库工具类

### 控制器
- `backend/src/controllers/authController.js`
- `backend/src/controllers/roomController.js`
- `backend/src/controllers/gameController.js`
- `backend/src/controllers/leaderboardController.js`

### 文档
- `README.md` - 更新安装说明
- `init-db.sh` - 更新初始化脚本

## SQLite 的优势

1. **零配置**: 无需安装和配置数据库服务器
2. **轻量级**: 单个文件存储所有数据
3. **便携性**: 数据库文件可以直接复制
4. **性能**: 对于中小型应用性能优秀
5. **简化部署**: 减少依赖和配置复杂度

## SQLite 的限制

1. **并发写入**: 同一时间只能有一个写操作
2. **数据类型**: 类型系统较简单
3. **扩展性**: 不适合大规模并发场景
4. **功能**: 缺少一些高级数据库特性

## 测试建议

迁移后建议测试以下功能：

1. ✅ 用户注册和登录
2. ✅ 创建和加入房间
3. ✅ 开始游戏轮次
4. ✅ 提交猜测（三种模式）
5. ✅ 游戏结算和积分计算
6. ✅ 排行榜显示
7. ✅ 用户转账
8. ✅ WebSocket 实时更新

## 回滚方案

如需回滚到 PostgreSQL：

1. 恢复 `package.json` 中的 `pg` 依赖
2. 恢复所有控制器文件的查询语法
3. 恢复 `database.js` 和 `database.sql`
4. 恢复环境变量配置

建议在迁移前创建 Git 分支或备份。

## 性能优化建议

1. 启用 WAL 模式（已启用）
2. 定期执行 `VACUUM` 清理数据库
3. 合理使用索引（已创建）
4. 使用事务批量操作（已实现）

## 总结

迁移已完成，所有核心功能保持不变。SQLite 为项目提供了更简单的部署方式，适合中小型应用场景。
