import { Router, Request, Response } from 'express';
import User from '../models/User';
import GameRecord from '../models/GameRecord';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { config } from '../config';

const router = Router();

/**
 * GET /api/leaderboard
 * Query: ?subject=&limit=20
 * 排行榜：按总分或单科最佳分数排序
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { subject, limit = '20' } = req.query;
    const lim = Math.min(parseInt(limit as string) || 20, config.leaderboard.maxSize);

    let users;
    if (subject && typeof subject === 'string') {
      // 单科排行：按该学科 bestScore 降序
      const sortField = `subjects.${subject}.bestScore`;
      users = await User.find(
        { [`subjects.${subject}`]: { $exists: true } },
        { openid: 0, __v: 0 }
      )
        .sort({ [sortField]: -1 })
        .limit(lim)
        .lean();
    } else {
      // 总分排行
      users = await User.find({}, { openid: 0, __v: 0 })
        .sort({ totalScore: -1 })
        .limit(lim)
        .lean();
    }

    const list = users.map((u, i) => ({
      rank: i + 1,
      id: u._id,
      nickname: u.nickname,
      avatar: u.avatar,
      totalScore: u.totalScore,
      subjects: u.subjects,
    }));

    res.json({ list });
  } catch (err) {
    console.error('排行榜查询错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/leaderboard/me
 * 获取当前用户的排名（需要 token）
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    const { subject } = req.query;
    let rank = 0;
    if (subject && typeof subject === 'string') {
      const sortField = `subjects.${subject}.bestScore`;
      rank = await User.countDocuments({
        [`subjects.${subject}.bestScore`]: { $gt: user.subjects?.[subject]?.bestScore || 0 },
      });
    } else {
      rank = await User.countDocuments({ totalScore: { $gt: user.totalScore || 0 } });
    }

    res.json({
      rank: rank + 1,
      totalScore: user.totalScore,
      subjects: user.subjects,
    });
  } catch (err) {
    console.error('个人排名查询错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/leaderboard/stats
 * 全局统计：总用户数、总答题数、今日活跃
 */
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.countDocuments();
    const totalGames = await GameRecord.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayGames = await GameRecord.countDocuments({ createdAt: { $gte: today } });
    const todayUsers = await User.countDocuments({ updatedAt: { $gte: today } });

    res.json({
      totalUsers,
      totalGames,
      todayGames,
      todayUsers,
    });
  } catch (err) {
    console.error('统计查询错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
