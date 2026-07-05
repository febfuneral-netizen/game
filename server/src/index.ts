import express from 'express';
import http from 'http';
import path from 'path';
import socketio from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import { config } from './config';
import userRoutes from './routes/user';
import gameRoutes from './routes/game';
import questionRoutes from './routes/questions';
import leaderboardRoutes from './routes/leaderboard';
import challengeRoutes from './routes/challenge';
import shopRoutes from './routes/shop';
import { setupBattleSocket } from './socket/battleHandler';
import { generateToken } from './middleware/auth';

const app = express();

// 创建 HTTP 服务器（Express + Socket.IO 共用）
const server = http.createServer(app);

// ==================== Socket.IO 配置（参考 Rocket.Chat + 官方生产最佳实践） ====================
//
// 关键决策：
// - socket.io@2.5.0（EIO v3），与小程序 weapp.socket.io@2.2.1 协议兼容
// - 路径 /ws，Nginx 已配置 proxy_pass + Upgrade 头
// - 不提供 client js（生产模式 serveClient: false）
// - 启用 WebSocket 压缩（perMessageDeflate）减少带宽
// - Cookie 鉴权作为 query token 的备用方案
// ====================

const io = socketio(server, {
  // 路径（Nginx 需对应 proxy_pass）
  path: '/ws',

  // 生产环境不附带 socket.io-client.js
  serveClient: false,

  // 心跳：25s ping / 10s 超时（Rocket.Chat 推荐）
  pingInterval: 25000,
  pingTimeout: 10000,

  // 连接升级超时
  upgradeTimeout: 10000,

  // 允许传输升级（polling → websocket）
  allowUpgrades: true,

  // 传输方式（优先 WebSocket，降级 polling）
  transports: ['websocket', 'polling'],

  // WebSocket 压缩（per-message deflate，减少 70%+ 带宽）
  perMessageDeflate: {
    threshold: 1024, // 大于 1KB 的消息才压缩
  },

  // HTTP 长轮询响应压缩
  httpCompression: {
    threshold: 1024,
  },

  // 最大消息体积 1MB（防止恶意大包）
  maxHttpBufferSize: 1e6,

  // Cookie（用于鉴权回退，不设置 cookie 名以避免冲突）
  cookie: false,

  // WebSocket 引擎（默认 ws，Node 内置兼容）
  wsEngine: 'ws',
});

// ==================== 启动对战 WebSocket 服务 ====================
// 使用 /battle 命名空间隔离对战事件（Rocket.Chat 采用命名空间模式）
const battleNsp = io.of('/battle');
setupBattleSocket(io, battleNsp);

// 中间件
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 静态文件（web测试页面等）
app.use(express.static(path.join(__dirname, '..', 'public')));

// 路由
app.use('/api/user', userRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/challenge', challengeRoutes);
app.use('/api/shop', shopRoutes);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 获取测试 Token（用于 web 测试页面、管理后台） — 限管理员使用
app.get('/api/dev/token', async (_req, res) => {
  try {
    const User = (await import('./models/User')).default;
    const users = await User.find().limit(2).lean();
    // 返回最多2个用户，供双人测试
    const result = users.map((u: any) => ({
      token: generateToken(u._id.toString()),
      userId: u._id.toString(),
      nickname: u.nickname || '玩家',
      avatar: u.avatar || '',
    }));
    if (result.length === 0) {
      return res.status(404).json({ error: '数据库无用户，请先在小程序登录一次' });
    }
    res.json({ users: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 连接 MongoDB 并启动服务
mongoose
  .connect(config.mongoUri)
  .then(() => {
    console.log('✅ MongoDB 连接成功');
    server.listen(config.port, () => {
      console.log(`🚀 服务器运行在 http://localhost:${config.port}`);
      console.log(`   WebSocket 路径: /ws`);
      console.log(`   环境: ${config.nodeEnv}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB 连接失败:', err);
    process.exit(1);
  });
