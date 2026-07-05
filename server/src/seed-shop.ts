/**
 * 商店种子数据 — 初始化商品列表
 * 运行: npx ts-node src/seed-shop.ts
 */
import mongoose from 'mongoose';
import { config } from './config';
import ShopItem from './models/ShopItem';

const DEFAULT_ITEMS = [
  // ─── 零食类 ───
  { name: '冰淇淋',     emoji: '🍦', description: '一支美味的甜筒冰淇淋',           category: '零食', pointCost: 50,  sortOrder: 1 },
  { name: '巧克力',     emoji: '🍫', description: '一块丝滑的牛奶巧克力',           category: '零食', pointCost: 80,  sortOrder: 2 },
  { name: '薯片大礼包', emoji: '🥔', description: '超大包薯片，多种口味任选',       category: '零食', pointCost: 150, sortOrder: 3 },
  { name: '奶茶',       emoji: '🧋', description: '一杯甜甜的珍珠奶茶',             category: '零食', pointCost: 100, sortOrder: 4 },
  { name: '糖果套装',   emoji: '🍬', description: '五颜六色的糖果大集合',           category: '零食', pointCost: 60,  sortOrder: 5 },

  // ─── 娱乐类 ───
  { name: '看动画30分钟', emoji: '📺', description: '多看30分钟动画片',            category: '娱乐', pointCost: 120, sortOrder: 6 },
  { name: '玩游戏30分钟', emoji: '🎮', description: '多玩30分钟游戏',               category: '娱乐', pointCost: 200, sortOrder: 7 },
  { name: '周末郊游',     emoji: '🏕️', description: '周末去公园/郊外玩一天',        category: '娱乐', pointCost: 500, sortOrder: 8 },
  { name: '电影之夜',     emoji: '🎬', description: '选一部喜欢的电影全家一起看',    category: '娱乐', pointCost: 300, sortOrder: 9 },

  // ─── 学习类 ───
  { name: '新绘本',      emoji: '📖', description: '去书店挑一本新绘本',            category: '学习', pointCost: 200, sortOrder: 10 },
  { name: '文具套装',    emoji: '✏️', description: '铅笔橡皮尺子文具大礼包',        category: '学习', pointCost: 100, sortOrder: 11 },
  { name: '科学实验盒',  emoji: '🔬', description: '一套有趣的科学小实验套装',      category: '学习', pointCost: 400, sortOrder: 12 },
  { name: '乐高积木',    emoji: '🧱', description: '一套创意乐高积木',              category: '学习', pointCost: 350, sortOrder: 13 },

  // ─── 户外类 ───
  { name: '自行车骑行',  emoji: '🚲', description: '一起出去骑自行车',              category: '户外', pointCost: 150, sortOrder: 14 },
  { name: '水枪大战',    emoji: '🔫', description: '夏天来一场水枪大战',            category: '户外', pointCost: 100, sortOrder: 15 },
  { name: '摘水果',      emoji: '🍓', description: '去农场摘草莓/樱桃',             category: '户外', pointCost: 400, sortOrder: 16 },

  // ─── 玩具类 ───
  { name: '小玩具',        emoji: '🧸', description: '去玩具店挑一个小玩具',          category: '玩具', pointCost: 250, sortOrder: 17 },
  { name: '泡泡机',        emoji: '🫧', description: '一个自动泡泡机',               category: '玩具', pointCost: 150, sortOrder: 18 },
  { name: '橡皮泥套装',    emoji: '🎨', description: '一盒彩色橡皮泥',               category: '玩具', pointCost: 100, sortOrder: 19 },

  // ─── 高价值大奖 ───
  { name: '新书包',        emoji: '🎒', description: '去选一个喜欢的新书包',          category: '其他', pointCost: 800,  sortOrder: 20 },
  { name: '大餐一顿',      emoji: '🍕', description: '全家去吃一顿大餐（你选餐厅）',  category: '其他', pointCost: 1000, sortOrder: 21 },
  { name: '神秘大奖',      emoji: '🎁', description: '超级神秘大礼包，惊喜等你来开',  category: '其他', pointCost: 1500, sortOrder: 22 },
];

async function seed() {
  await mongoose.connect(config.mongoUri);
  console.log('✅ MongoDB 连接成功');

  // 清空已有商品（可选，避免重复）
  await ShopItem.deleteMany({});
  console.log('🗑️  已清空旧商品');

  // 批量插入
  await ShopItem.insertMany(DEFAULT_ITEMS);
  console.log(`🎉 已插入 ${DEFAULT_ITEMS.length} 个商品`);

  // 打印预览
  const items = await ShopItem.find().sort({ sortOrder: 1 });
  items.forEach((item) => {
    console.log(`  ${item.emoji} ${item.name} | ${item.pointCost}分 | ${item.category}`);
  });

  await mongoose.disconnect();
  console.log('✅ 种子数据初始化完成');
}

seed().catch((err) => {
  console.error('❌ 种子数据失败:', err);
  process.exit(1);
});
