#!/bin/bash

# SQLite 数据库初始化脚本

echo "正在初始化 SQLite 数据库..."

cd backend

# 使用 Node.js 执行 SQL 脚本
node -e "
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || './database.sqlite';
const db = new Database(dbPath);

const sql = fs.readFileSync(path.join(__dirname, 'src/config/database.sql'), 'utf8');

// 执行 SQL 语句
db.exec(sql);

console.log('数据库表创建成功！');
db.close();
"

echo "数据库初始化完成！"
