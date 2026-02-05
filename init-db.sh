#!/bin/bash

# 数据库初始化脚本

echo "正在创建数据库..."
createdb oi_gambling 2>/dev/null || echo "数据库已存在"

echo "正在初始化数据库表..."
psql -d oi_gambling -f backend/src/config/database.sql

echo "数据库初始化完成！"
