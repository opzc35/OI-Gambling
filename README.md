# OI-Gambling 项目

一个基于 Codeforces 题目的竞猜游戏平台。

## 技术栈

- **后端**: Node.js + Express.js + PostgreSQL + WebSocket
- **前端**: React.js + TypeScript
- **外部API**: Codeforces API

## 功能特性

- 用户注册/登录系统
- 房间创建和管理
- 三种游戏模式：标签猜测、难度猜测、通过率猜测
- 实时 WebSocket 通信
- 排行榜系统
- 用户间转账功能

## 安装和运行

### 1. 数据库设置

首先，确保你已经安装了 PostgreSQL。然后创建数据库：

```bash
createdb oi_gambling
```

初始化数据库表：

```bash
psql -d oi_gambling -f backend/src/config/database.sql
```

### 2. 后端设置

```bash
cd backend
npm install
# 编辑 .env 文件，配置数据库连接和 JWT 密钥
npm run dev
```

后端将在 http://localhost:3000 运行

### 3. 前端设置

```bash
cd frontend
npm install
npm start
```

前端将在 http://localhost:3001 运行

## 环境变量配置

### 后端 (.env)

```
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/oi_gambling
JWT_SECRET=your-secret-key-change-this-in-production
NODE_ENV=development
```

### 前端 (.env)

```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

## 游戏规则

1. **房主创建房间** - 其他用户可以加入
2. **房主开始新游戏** - 选择游戏模式和扣分系数
3. **玩家提交猜测** - 根据游戏模式提交不同类型的猜测
4. **房主结算本轮** - 系统计算结果并分配积分
   - 猜错的玩家扣除积分
   - 总扣分平均分配给猜对的玩家
   - 如果没人猜对，则不发生分数变化

## 游戏模式

- **标签模式**: 猜测题目的算法标签集合（必须完全一致）
- **难度模式**: 猜测题目难度范围（区间大小 ≤ 200）
- **通过率模式**: 猜测题目通过率范围（区间大小 ≤ 10%）

## API 文档

详见 ARCHITECTURE.md

## 开发团队

OI-Gambling Team
