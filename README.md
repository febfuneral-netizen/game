# 学科答题闯关 - 微信小程序

> Taro 4 + React + Sass 构建的学科知识问答闯关游戏

## 项目结构

```
quiz-miniapp/
├── client/          # 微信小程序前端 (Taro 4 + React)
├── server/          # 后端 API 服务 (Express + MongoDB + JWT)
├── admin/           # 管理后台 (React + Ant Design + Vite)
├── deploy/          # 部署配置 (Nginx + PM2)
└── design/          # 游戏设计文档
```

## 技术栈

| 层       | 技术                                                         |
| -------- | ------------------------------------------------------------ |
| 前端     | Taro 4、React 18、Sass、Canvas 2D                            |
| 后端     | Express、TypeScript、Mongoose、JWT、Socket.IO                 |
| 数据库   | MongoDB                                                      |
| 管理后台 | React、Ant Design、Vite、Axios                               |
| 部署     | 阿里云 ECS、Nginx、PM2、Let's Encrypt                        |

## 玩法简介

- **6 大学科**: 语文 / 数学 / 英语 / 科学 / 历史 / 地理
- **闯关规则**: 每题 10 秒，答错即止，10 题全对通关
- **计分公式**: `(基础分 + 剩余时间×10) × Combo倍率`
- **生命系统**: 3 条生命，答错扣命，归零结束
- **Combo 连击**: ≥2 连触发，4 级特效（连击→暴走→超神→神一般）

## 快速开始

```bash
# 安装依赖
npm run install:all

# 启动后端 (开发)
npm run dev:server

# 启动前端 (微信小程序开发)
npm run dev:client

# 初始化题库
npm run seed

# 生产构建
npm run build:client
npm run build:server
```

## 部署

### 后端

```bash
cd deploy
bash deploy.sh
```

服务运行在 PM2（`quiz-server`，2 个 cluster），Nginx 反向代理 + SSL。

### 微信小程序

```bash
cd client
npm run build:weapp
```

构建产物输出到 `dist/`，使用微信开发者工具上传。

## 环境变量

后端环境变量配置在 `server/` 目录下的 `.env` 文件：

| 变量                | 说明           |
| ------------------- | -------------- |
| `PORT`              | 服务端口       |
| `MONGODB_URI`       | MongoDB 连接   |
| `JWT_SECRET`        | JWT 密钥       |
| `WX_APPID`          | 小程序 AppID   |
| `WX_APPSECRET`      | 小程序 Secret  |

## API 文档

| 方法   | 路径               | 说明             |
| ------ | ------------------ | ---------------- |
| POST   | `/api/user/login`  | 微信登录         |
| GET    | `/api/user/profile`| 用户信息         |
| POST   | `/api/game/start`  | 开始游戏         |
| POST   | `/api/game/submit` | 提交答案         |
| GET    | `/api/questions`   | 获取题库         |
| GET    | `/api/leaderboard` | 排行榜           |

## License

MIT
