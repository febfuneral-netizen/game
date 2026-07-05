import { Router, Request, Response } from 'express';
import GameRecord from '../models/GameRecord';
import Question from '../models/Question';
import User from '../models/User';
import { AuthRequest, authMiddleware, generateToken } from '../middleware/auth';
import { pickQuestions } from '../services/QuestionPicker';
import { judgeAnswer } from '../services/QuizEngine';

const router = Router();

// 应用鉴权中间件
router.use(authMiddleware as any);

/**
 * POST /api/game/start
 * Body: { subject: string }
 * 返回10题（不含 correctId）
 */
router.post('/start', async (req: AuthRequest, res: Response): Promise<void> => {
  const { subject } = req.body;
  if (!subject) {
    res.status(400).json({ error: '请选择学科' });
    return;
  }

  try {
    const questions = await pickQuestions(subject);
    if (questions.length < 10) {
      res.status(400).json({ error: '题库不足，请联系管理员' });
      return;
    }

    // 创建游戏记录
    const gameRecord = new GameRecord({
      userId: req.userId,
      subject,
      mode: 'single',
      status: 'eliminated', // 初始状态，答完题后更新
      totalQuestions: 10,
      answeredCount: 0,
      correctCount: 0,
      score: 0,
      questions: [],
      startedAt: new Date(),
      finishedAt: new Date(), // 会更新
    });
    await gameRecord.save();

    // 返回题目（不含 correctId）
    const safeQuestions = questions.map((q) => ({
      id: q._id,
      text: q.text,
      options: q.options.map((opt) => ({ id: opt.id, text: opt.text })),
      difficulty: q.difficulty,
    }));

    res.json({
      gameId: gameRecord._id,
      questions: safeQuestions,
    });
  } catch (err) {
    console.error('开始游戏错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * POST /api/game/submit
 * Body: { gameId, questionId, optionId, timeSpent }
 */
router.post('/submit', async (req: AuthRequest, res: Response): Promise<void> => {
  const { gameId, questionId, optionId, timeSpent } = req.body;
  if (!gameId || !questionId || !optionId) {
    res.status(400).json({ error: '参数不完整' });
    return;
  }

  try {
    const gameRecord = await GameRecord.findById(gameId);
    if (!gameRecord) {
      res.status(404).json({ error: '游戏记录不存在' });
      return;
    }

    // 校验是否是当前用户的游戏
    if (gameRecord.userId.toString() !== req.userId) {
      res.status(403).json({ error: '无权操作' });
      return;
    }

    // 检查是否已答过这题（幂等）
    const alreadyAnswered = gameRecord.questions.some(
      (q: any) => q.questionId.toString() === questionId
    );
    if (alreadyAnswered) {
      res.status(400).json({ error: '已提交过答案' });
      return;
    }

    const result = await judgeAnswer(gameRecord, questionId, optionId, timeSpent || 10);

    res.json(result);
  } catch (err: any) {
    console.error('提交答案错误:', err);
    res.status(500).json({ error: err.message || '服务器内部错误' });
  }
});

/**
 * GET /api/game/result/:gameId
 */
router.get('/result/:gameId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const gameRecord = await GameRecord.findById(req.params.gameId)
      .populate('questions.questionId', 'text options')
      .exec();

    if (!gameRecord) {
      res.status(404).json({ error: '游戏记录不存在' });
      return;
    }

    if (gameRecord.userId.toString() !== req.userId) {
      res.status(403).json({ error: '无权查看' });
      return;
    }

    res.json({
      gameId: gameRecord._id,
      subject: gameRecord.subject,
      totalQuestions: gameRecord.totalQuestions,
      answeredCount: gameRecord.answeredCount,
      correctCount: gameRecord.correctCount,
      score: gameRecord.score,
      status: gameRecord.status,
      details: gameRecord.questions.map((q: any) => ({
        questionId: q.questionId?._id,
        questionText: q.questionId?.text,
        selectedOptionId: q.selectedOptionId,
        correct: q.correct,
        timeSpent: q.timeSpent,
      })),
    });
  } catch (err) {
    console.error('获取结果错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
