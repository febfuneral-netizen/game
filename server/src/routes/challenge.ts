import { Router, Request, Response } from 'express';
import User from '../models/User';
import GameRecord from '../models/GameRecord';
import DailyChallenge from '../models/DailyChallenge';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { config } from '../config';

const router = Router();

/**
 * GET /api/challenge/daily
 * 获取今日挑战状态
 */
router.get('/daily', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let challenge = await DailyChallenge.findOne({ userId, date: today }).lean();

    if (!challenge) {
      const randomSubject = config.dailyChallenge.subjects[
        Math.floor(Math.random() * config.dailyChallenge.subjects.length)
      ];
      challenge = await DailyChallenge.create({
        userId,
        date: today,
        subject: randomSubject,
      });
    }

    // 获取该用户的历史挑战记录（最近7天）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const history = await DailyChallenge.find({
      userId,
      date: { $gte: sevenDaysAgo.toISOString().split('T')[0] },
    })
      .sort({ date: -1 })
      .lean();

    res.json({
      today: challenge,
      history,
      streak: calculateStreak(history),
    });
  } catch (err) {
    console.error('每日挑战查询错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/challenge/daily/complete
 * 完成每日挑战
 */
router.post('/daily/complete', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req;
    const today = new Date().toISOString().split('T')[0];
    const { score, questionsAnswered } = req.body;

    const challenge = await DailyChallenge.findOneAndUpdate(
      { userId, date: today },
      {
        completed: true,
        score: score || 0,
        questionsAnswered: questionsAnswered || 0,
      },
      { new: true, upsert: true }
    );

    // 同时更新用户总分
    if (score > 0) {
      await User.findByIdAndUpdate(userId, { $inc: { totalScore: score } });
    }

    res.json({ success: true, challenge });
  } catch (err) {
    console.error('每日挑战完成错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/challenge/stats
 * 获取挑战统计数据（连续天数、总挑战数等）
 */
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req;
    const totalChallenges = await DailyChallenge.countDocuments({ userId, completed: true });
    const history = await DailyChallenge.find({ userId, completed: true })
      .sort({ date: -1 })
      .lean();

    res.json({
      totalChallenges,
      streak: calculateStreak(history),
      history,
    });
  } catch (err) {
    console.error('挑战统计错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * 计算连续天数
 */
function calculateStreak(history: { date: string; completed: boolean }[]): number {
  const completedDates = history
    .filter((h) => h.completed)
    .map((h) => h.date)
    .sort()
    .reverse();

  if (completedDates.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  const lastDate = new Date(completedDates[0]);

  // 如果最后一次完成不是今天或昨天，连续中断
  const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
  if (diffDays > 1) return 0;

  for (let i = 1; i < completedDates.length; i++) {
    const curr = new Date(completedDates[i]);
    const prev = new Date(completedDates[i - 1]);
    const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default router;
