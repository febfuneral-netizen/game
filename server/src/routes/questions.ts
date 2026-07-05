import { Router, Request, Response } from 'express';
import Question, { IQuestion } from '../models/Question';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * GET /api/questions
 * 公开接口 - 查询题目（不含正确答案）
 * admin模式(?admin=1) - 需JWT鉴权，含correctId，供后台管理使用
 * Query: ?subject=math&chapter=1&difficulty=1&limit=10&skip=0&admin=1
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { subject, difficulty, chapter, limit, skip, admin } = req.query;
  const isAdmin = admin === '1';

  // admin 模式需要鉴权
  if (isAdmin) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: '管理员需要登录' });
      return;
    }
  }

  const query: any = {};
  if (subject) query.subject = subject;
  if (difficulty) query.difficulty = Number(difficulty);
  if (chapter) query.chapter = Number(chapter);

  try {
    const q = Question.find(query)
      .limit(Number(limit) || 100)
      .skip(Number(skip) || 0)
      .sort({ subject: 1, chapter: 1, difficulty: 1 });

    // 非管理员模式隐藏正确答案
    if (!isAdmin) {
      q.select('-correctId');
    }

    const questions = await q.exec();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

/**
 * POST /api/questions (需要鉴权 - 管理员添加题目)
 * Body: 单个题目对象 或 题目数组
 */
router.post('/', authMiddleware as any, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const questions = Array.isArray(req.body) ? req.body : [req.body];
    const result = await Question.insertMany(questions);
    res.json({ inserted: result.length, message: '添加成功' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/questions/:id (需要鉴权 - 删除题目)
 */
router.delete('/:id', authMiddleware as any, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await Question.findByIdAndDelete(req.params.id);
    if (!result) {
      res.status(404).json({ error: '题目不存在' });
      return;
    }
    res.json({ message: '删除成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/questions/count
 * 公开接口 - 获取各科目题目数量
 */
router.get('/count', async (_req: Request, res: Response): Promise<void> => {
  try {
    const counts = await Question.aggregate([
      { $group: { _id: '$subject', count: { $sum: 1 } } }
    ]);
    const result: Record<string, number> = {};
    counts.forEach((item: any) => {
      result[item._id] = item.count;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

export default router;
