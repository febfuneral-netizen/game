import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { generateToken } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'quiz-miniapp-secret-key-2026';
const APPID = process.env.WX_APPID || 'wxaf69d3a09b5f22f4';
const APP_SECRET = process.env.WX_APP_SECRET || '1df61364c47da8d10cf53e6ff14815ac';

interface WxLoginResponse {
  openid: string;
  session_key: string;
}

/**
 * POST /api/user/login
 * Body: { code: string }  (wx.login() 返回的 code)
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: '缺少code参数' });
    return;
  }

  try {
    // 调用微信接口获取 openid
    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${APP_SECRET}&js_code=${code}&grant_type=authorization_code`;

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
      user: {
        id: user._id,
        nickname: user.nickname,
        avatar: user.avatar,
        totalScore: user.totalScore,
        subjects: Object.fromEntries(Object.entries(user.subjects)),
      },
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
router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: '未授权' });
    return;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json({
      id: user._id,
      nickname: user.nickname,
      avatar: user.avatar,
      totalScore: user.totalScore,
      subjects: Object.fromEntries(Object.entries(user.subjects)),
    });
  } catch {
    res.status(401).json({ error: 'Token无效' });
  }
});

export default router;
