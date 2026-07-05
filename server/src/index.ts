import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { config } from './config';
import userRoutes from './routes/user';
import gameRoutes from './routes/game';
import questionRoutes from './routes/questions';
import leaderboardRoutes from './routes/leaderboard';
import challengeRoutes from './routes/challenge';
import shopRoutes from './routes/shop';

const app = express();

// 中间件
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

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

// 连接 MongoDB 并启动服务
mongoose
  .connect(config.mongoUri)
  .then(() => {
    console.log('✅ MongoDB 连接成功');
    app.listen(config.port, () => {
      console.log(`🚀 服务器运行在 http://localhost:${config.port}`);
      console.log(`   环境: ${config.nodeEnv}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB 连接失败:', err);
    process.exit(1);
  });
