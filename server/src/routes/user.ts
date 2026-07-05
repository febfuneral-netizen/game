import { Router, Request, Response } from 'express';
import User from '../models/User';
import { config } from '../config';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

interface WxLoginResponse {
  openid: string;
  session_key: string;
}

/**
 * POST /api/user/login
 * 小程序: Body { code: string }  (wx.login() 返回的 code)
 * 管理后台: Body { nickname: string }  (管理员昵称登录)
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { code, nickname } = req.body;

  // 管理后台登录：昵称方式
  if (nickname) {
    try {
      let user = await User.findOne({ nickname });
      if (!user) {
        user = new User({ nickname, openid: 'admin_' + nickname });
        await user.save();
      }
      const token = generateToken(user._id.toString());
      res.json({ token, user: formatUserProfile(user) });
    } catch (err) {
      console.error('管理后台登录错误:', err);
      res.status(500).json({ error: '服务器内部错误' });
    }
    return;
  }

  if (!code) {
    res.status(400).json({ error: '缺少 code 或 nickname 参数' });
    return;
  }

  try {
    // 调用微信接口获取 openid
    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${config.wxAppId}&secret=${config.wxAppSecret}&js_code=${code}&grant_type=authorization_code`;

    // 注意：生产环境应使用 axios，这里用 fetch (Node 18+ 支持)
    const wxRes = await fetch(wxUrl);
    const wxData = await wxRes.json() as WxLoginResponse & { errcode?: number; errmsg?: string };

    if (wxData.errcode) {
      res.status(400).json({ error: `微信登录失败: ${wxData.errmsg}` });
      return;
    }

    const { openid } = wxData;
    if (!openid) {
      res.status(400).json({ error: '获取openid失败' });
      return;
    }

    // 查找或创建用户
    let user = await User.findOne({ openid });
    if (!user) {
      user = new User({ openid });
      await user.save();
    }

    const token = generateToken(user._id.toString());
    res.json({
      token,
      user: formatUserProfile(user),
    });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

/**
 * GET /api/user/profile
 * Header: Authorization: Bearer <token>
 */
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json(formatUserProfile(user));
  } catch (err) {
    console.error('获取用户资料错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;

const SUBJECT_ORDER = ['chinese', 'math', 'english', 'science', 'history', 'geography'] as const;

/**
 * 格式化用户资料输出：
 * - 6学科全开放，不再有学科级锁定
 * - 学科内章节按 currentChapter 递进解锁
 * - 根据总进度计算称号和成就
 */
function formatUserProfile(user: any): any {
  const rawSubjects = user.subjects instanceof Map
    ? Object.fromEntries(user.subjects)
    : (typeof user.subjects === 'object' ? { ...user.subjects } : {});

  // 确保所有6个学科都存在默认值（全部 newbie，不再 locked）
  const allSubjects: Record<string, any> = {};
  for (const s of SUBJECT_ORDER) {
    const raw = rawSubjects[s] || {};
    allSubjects[s] = {
      progress: raw.progress === 'locked' ? 'newbie' : (raw.progress || 'newbie'),
      bestScore: raw.bestScore || 0,
      currentChapter: raw.currentChapter || 1,
    };
  }

  // 计算已通关章节总数（currentChapter-1 代表已通过的章数）
  const totalClearedChapters = Object.values(allSubjects).reduce((sum: number, s: any) => {
    return sum + Math.max(0, (s.currentChapter || 1) - 1);
  }, 0);

  // 计算称号
  const title = computeTitle(totalClearedChapters, user.totalScore);

  // 计算成就
  const achievements = computeAchievements(allSubjects, totalClearedChapters, user.totalScore);

  return {
    id: user._id,
    nickname: user.nickname,
    avatar: user.avatar,
    totalScore: user.totalScore,
    subjects: allSubjects,
    title,
    achievements,
  };
}

/**
 * 称号系统：基于已通关章节总数
 */
const TITLE_TIERS: { min: number; title: string; emoji: string; color: string }[] = [
  { min: 30, title: '学神降临',   emoji: '👑', color: '#FFD700' },
  { min: 25, title: '天下无双',   emoji: '💎', color: '#C0A0FF' },
  { min: 20, title: '才贯二酉',   emoji: '🏆', color: '#FF6B6B' },
  { min: 15, title: '学富五车',   emoji: '📚', color: '#4B8BFF' },
  { min: 10, title: '才高八斗',   emoji: '⭐', color: '#F59E0B' },
  { min: 6,  title: '博闻强识',   emoji: '🎓', color: '#10B981' },
  { min: 3,  title: '学海泛舟',   emoji: '📖', color: '#6366F1' },
  { min: 1,  title: '小有所成',   emoji: '🌱', color: '#06B6D4' },
  { min: 0,  title: '初出茅庐',   emoji: '🎒', color: '#9CA3AF' },
];

function computeTitle(clearedChapters: number, totalScore: number) {
  for (const tier of TITLE_TIERS) {
    if (clearedChapters >= tier.min) {
      return { name: tier.title, emoji: tier.emoji, color: tier.color };
    }
  }
  return TITLE_TIERS[TITLE_TIERS.length - 1]; // fallback
}

/**
 * 成就系统：检查各项里程碑
 */
interface Achievement {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  unlocked: boolean;
}

function computeAchievements(
  subjects: Record<string, any>,
  totalCleared: number,
  totalScore: number
): Achievement[] {
  const achievements: Achievement[] = [
    {
      id: 'first_game',
      name: '初次挑战',
      desc: '完成第一次答题挑战',
      emoji: '🎮',
      unlocked: totalScore > 0,
    },
    {
      id: 'first_chapter',
      name: '入门学者',
      desc: '任意学科通关第1章',
      emoji: '🔰',
      unlocked: Object.values(subjects).some((s: any) => (s.currentChapter || 1) > 1),
    },
    {
      id: 'high_score',
      name: '积分达人',
      desc: '总分超过 500',
      emoji: '💯',
      unlocked: totalScore >= 500,
    },
    {
      id: 'score_1000',
      name: '千分斩',
      desc: '总分超过 1000',
      emoji: '🏅',
      unlocked: totalScore >= 1000,
    },
    {
      id: 'half_subjects',
      name: '三科并进',
      desc: '3 个学科至少通关第1章',
      emoji: '📐',
      unlocked: Object.values(subjects).filter((s: any) => (s.currentChapter || 1) > 1).length >= 3,
    },
    {
      id: 'all_started',
      name: '全科起步',
      desc: '6 个学科全部完成过挑战',
      emoji: '🌟',
      unlocked: Object.values(subjects).every((s: any) => s.progress !== 'newbie'),
    },
    {
      id: 'subject_master',
      name: '学科制霸',
      desc: '任一学科通关全部5章',
      emoji: '🔱',
      unlocked: Object.values(subjects).some((s: any) => s.currentChapter > 5 || s.progress === 'cleared'),
    },
    {
      id: 'half_way',
      name: '半壁江山',
      desc: '累计通关 15 个章节',
      emoji: '🏔️',
      unlocked: totalCleared >= 15,
    },
    {
      id: 'all_cleared',
      name: '学贯中西',
      desc: '全部 6 学科 30 章通关',
      emoji: '👑',
      unlocked: totalCleared >= 30,
    },
    {
      id: 'score_3000',
      name: '积分富豪',
      desc: '总分超过 3000',
      emoji: '💰',
      unlocked: totalScore >= 3000,
    },
  ];

  return achievements;
}
