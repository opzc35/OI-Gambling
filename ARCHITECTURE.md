# OI-Gambling 系统架构设计

## 项目概述
一个基于 Codeforces 题目的竞猜游戏平台，用户可以猜测题目的算法标签、难度和通过率。

## 技术栈
- **后端**: Node.js + Express.js
- **数据库**: PostgreSQL
- **前端**: React.js
- **实时通信**: WebSocket (ws)
- **外部API**: Codeforces API

## 系统架构

### 1. 数据库设计

#### 用户表 (users)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  points DECIMAL(10,2) DEFAULT 1000.00 CHECK (points >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 房间表 (rooms)
```sql
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  owner_id INTEGER REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 房间成员表 (room_members)
```sql
CREATE TABLE room_members (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id),
  user_id INTEGER REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, user_id)
);
```

#### 游戏轮次表 (game_rounds)
```sql
CREATE TABLE game_rounds (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id),
  problem_id VARCHAR(50) NOT NULL, -- Codeforces problem ID
  problem_name VARCHAR(255),
  problem_tags TEXT[], -- 实际标签
  problem_rating INTEGER, -- 实际难度
  problem_solved_count INTEGER, -- 实际通过数
  problem_total_attempts INTEGER, -- 总尝试数
  actual_pass_rate DECIMAL(5,2), -- 实际通过率
  game_mode VARCHAR(20) NOT NULL, -- 'tags', 'rating', 'pass_rate'
  penalty_coefficient DECIMAL(10,2) NOT NULL, -- 扣分系数
  status VARCHAR(20) DEFAULT 'ongoing', -- 'ongoing', 'settled'
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settled_at TIMESTAMP
);
```

#### 猜测表 (guesses)
```sql
CREATE TABLE guesses (
  id SERIAL PRIMARY KEY,
  round_id INTEGER REFERENCES game_rounds(id),
  user_id INTEGER REFERENCES users(id),
  guess_tags TEXT[], -- 猜测的标签（多选）
  guess_rating_min INTEGER, -- 猜测难度范围最小值
  guess_rating_max INTEGER, -- 猜测难度范围最大值
  guess_pass_rate_min DECIMAL(5,2), -- 猜测通过率范围最小值
  guess_pass_rate_max DECIMAL(5,2), -- 猜测通过率范围最大值
  is_correct BOOLEAN, -- 是否猜对
  points_change DECIMAL(10,2) DEFAULT 0, -- 本轮分数变化
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(round_id, user_id)
);
```

#### 交易表 (transactions)
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER REFERENCES users(id),
  to_user_id INTEGER REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. API 设计

#### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

#### 房间管理
- `POST /api/rooms` - 创建房间（房主）
- `GET /api/rooms` - 获取房间列表
- `GET /api/rooms/:id` - 获取房间详情
- `POST /api/rooms/:id/join` - 加入房间
- `POST /api/rooms/:id/leave` - 离开房间
- `DELETE /api/rooms/:id` - 关闭房间（仅房主）

#### 游戏轮次
- `POST /api/rooms/:id/rounds` - 开始新一轮游戏（仅房主）
  - Body: `{ gameMode: 'tags'|'rating'|'pass_rate', penaltyCoefficient: number }`
- `GET /api/rooms/:id/rounds/current` - 获取当前轮次信息
- `POST /api/rounds/:id/guess` - 提交猜测
  - Body: 根据游戏模式不同：
    - tags: `{ tags: string[] }`
    - rating: `{ ratingMin: number, ratingMax: number }` (区间大小需 <= 200)
    - pass_rate: `{ passRateMin: number, passRateMax: number }` (区间大小需 <= 10)
- `POST /api/rounds/:id/settle` - 结算本轮（仅房主）

#### 排行榜
- `GET /api/leaderboard` - 获取前10名用户

#### 转账
- `POST /api/transactions` - 转账给其他用户
  - Body: `{ toUserId: number, amount: number }`
- `GET /api/transactions/history` - 获取交易历史

### 3. WebSocket 事件

#### 客户端 -> 服务器
- `join_room` - 加入房间
- `leave_room` - 离开房间

#### 服务器 -> 客户端
- `room_updated` - 房间成员变化
- `round_started` - 新一轮游戏开始
- `guess_submitted` - 有用户提交猜测
- `round_settled` - 本轮结算完成
- `points_updated` - 分数更新

### 4. 游戏流程

1. **房主创建房间**
   - 其他用户可以加入房间

2. **房主开始新一轮游戏**
   - 选择游戏模式（标签/难度/通过率）
   - 设置扣分系数
   - 系统从 Codeforces 随机选择一道题目
   - 公开题目名称给所有玩家

3. **玩家提交猜测**
   - 根据游戏模式提交不同类型的猜测
   - 每人每轮只能提交一次

4. **房主结算本轮**
   - 系统计算每个玩家的猜测是否正确
   - 判定规则：
     - **标签模式**: 玩家猜测的标签集合与题目实际标签集合完全一致
     - **难度模式**: 题目实际难度在玩家猜测的区间内
     - **通过率模式**: 题目实际通过率在玩家猜测的区间内
   - 猜错的玩家扣除 `penaltyCoefficient` 分
   - 总扣分平均分配给猜对的玩家
   - 如果没人猜对，则不发生分数变化
   - 更新所有玩家分数

5. **继续下一轮或结束**

### 5. Codeforces API 集成

使用 Codeforces API: `https://codeforces.com/api/problemset.problems`

返回数据包含：
- `contestId` + `index`: 题目唯一标识
- `name`: 题目名称
- `tags`: 算法标签数组
- `rating`: 难度值
- `solvedCount`: 通过人数（需计算通过率）

**注意**: Codeforces API 可能没有直接提供通过率，需要通过其他方式计算或估算。

### 6. 安全考虑

- 使用 bcrypt 对密码进行哈希
- 使用 JWT 进行身份验证
- 输入验证和 SQL 注入防护
- 限制猜测区间大小（难度 <= 200，通过率 <= 10%）
- 防止分数为负（数据库约束）
- 转账金额验证（不能超过自己的余额）

### 7. 前端页面设计

1. **登录/注册页面**
2. **大厅页面** - 显示所有房间，可创建/加入房间
3. **房间页面** - 显示当前游戏状态、成员列表、提交猜测
4. **排行榜页面** - 显示前10名用户
5. **个人中心** - 显示个人信息、分数、转账功能

## 开发步骤

1. 搭建后端基础架构
2. 配置数据库连接和模型
3. 实现用户认证系统
4. 实现房间管理功能
5. 集成 Codeforces API
6. 实现游戏逻辑和结算系统
7. 实现排行榜和转账功能
8. 搭建 WebSocket 实时通信
9. 开发前端 React 应用
10. 集成前后端
11. 测试和优化