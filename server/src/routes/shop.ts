import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import ShopItem from '../models/ShopItem';
import Redemption from '../models/Redemption';
import User from '../models/User';

const router = Router();

// ============================================================
// 公共接口
// ============================================================

/**
 * GET /api/shop/items
 * 获取所有上架商品（无需登录）
 */
router.get('/items', async (_req: Request, res: Response) => {
  try {
    const items = await ShopItem.find({ isActive: true }).sort({ sortOrder: 1, pointCost: 1 });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取商品列表失败' });
  }
});

// ============================================================
// 需登录接口
// ============================================================

/**
 * POST /api/shop/redeem
 * 兑换商品：扣积分、生成兑换记录（进入背包）
 * Body: { itemId }
 */
router.post('/redeem', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.body;
    const userId = (req as any).userId;

    if (!itemId) {
      res.status(400).json({ error: '请选择要兑换的商品' });
      return;
    }

    // 1. 查找商品
    const item = await ShopItem.findById(itemId);
    if (!item || !item.isActive) {
      res.status(404).json({ error: '商品不存在或已下架' });
      return;
    }

    // 2. 查找用户
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    // 3. 检查积分是否足够
    if (user.totalScore < item.pointCost) {
      res.status(400).json({ error: `积分不足！需要 ${item.pointCost} 分，当前 ${user.totalScore} 分` });
      return;
    }

    // 4. 扣积分
    user.totalScore -= item.pointCost;
    await user.save();

    // 5. 创建兑换记录（进入背包）
    const redemption = await Redemption.create({
      userId,
      itemId: item._id,
      itemSnapshot: {
        name: item.name,
        emoji: item.emoji,
        description: item.description,
        pointCost: item.pointCost,
      },
      status: 'active',
      purchasedAt: new Date(),
    });

    res.json({
      success: true,
      message: `成功兑换「${item.name}」！已放入背包`,
      redemption: {
        id: redemption._id,
        item: redemption.itemSnapshot,
        purchasedAt: redemption.purchasedAt,
      },
      remainingScore: user.totalScore,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '兑换失败' });
  }
});

/**
 * GET /api/shop/backpack/count
 * 获取用户背包物品数量
 */
router.get('/backpack/count', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const count = await Redemption.countDocuments({ userId, status: 'active' });
    res.json({ count });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取背包数量失败' });
  }
});

/**
 * GET /api/shop/backpack
 * 获取用户的背包（未核销的兑换记录）
 */
router.get('/backpack', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const items = await Redemption.find({ userId, status: 'active' })
      .sort({ purchasedAt: -1 });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取背包失败' });
  }
});

/**
 * POST /api/shop/verify/:redemptionId
 * 核销（父母确认）— 将兑换记录标记为已使用
 */
router.post('/verify/:redemptionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { redemptionId } = req.params;
    const userId = (req as any).userId;

    const redemption = await Redemption.findOne({ _id: redemptionId, userId, status: 'active' });
    if (!redemption) {
      res.status(404).json({ error: '该兑换记录不存在或已核销' });
      return;
    }

    redemption.status = 'verified';
    redemption.verifiedAt = new Date();
    await redemption.save();

    res.json({
      success: true,
      message: `「${redemption.itemSnapshot.name}」已核销，去找爸爸妈妈兑现吧！`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '核销失败' });
  }
});

/**
 * GET /api/shop/history
 * 获取所有兑换历史（含已核销）
 */
router.get('/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const list = await Redemption.find({ userId })
      .sort({ purchasedAt: -1 })
      .limit(50);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '获取兑换历史失败' });
  }
});

// ============================================================
// 管理接口（预留，后续可加权限控制）
// ============================================================

/**
 * POST /api/shop/items — 添加/批量添加商品
 */
router.post('/items', authMiddleware, async (req: Request, res: Response) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const created = await ShopItem.insertMany(items);
    res.json({ success: true, count: created.length, items: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '添加商品失败' });
  }
});

/**
 * DELETE /api/shop/items/:id — 下架/删除商品
 */
router.delete('/items/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ShopItem.findByIdAndDelete(id);
    res.json({ success: true, message: '商品已删除' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '删除商品失败' });
  }
});

export default router;
