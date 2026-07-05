import dotenv from 'dotenv';

// 确保在所有模块之前加载 .env
dotenv.config();

/**
 * 读取必需的环境变量，缺失时立即报错退出
 * 杜绝硬编码 fallback，防止敏感信息泄露到源码
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ 缺少必需的环境变量: ${key}`);
    console.error(`   请在 .env 文件中配置或设置系统环境变量`);
    process.exit(1);
  }
  return value;
}

/**
 * 统一配置中心 —— 整个项目唯一的环境变量入口
 *
 * 新增配置只需在此文件追加，其他地方 import { config } from '../config' 即可
 */
export const config = {
  // ==================== 基础服务 ====================
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // ==================== 数据库 ====================
  mongoUri: requireEnv('MONGO_URI'),

  // ==================== JWT 鉴权 ====================
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // ==================== 微信小程序 ====================
  wxAppId: requireEnv('WX_APPID'),
  wxAppSecret: requireEnv('WX_APP_SECRET'),

  // ==================== CORS（生产环境应限制来源） ====================
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // ==================== 排行榜系统 ====================
  leaderboard: {
    /** 默认最大展示人数 */
    maxSize: parseInt(process.env.LEADERBOARD_MAX_SIZE || '50', 10),
    /** 缓存 TTL（秒），0=不缓存 */
    cacheTtl: parseInt(process.env.LEADERBOARD_CACHE_TTL || '0', 10),
  },

  // ==================== 每日挑战 ====================
  dailyChallenge: {
    /** 每日挑战可选学科列表 */
    subjects: (process.env.DAILY_CHALLENGE_SUBJECTS || 'chinese,math,english,science,history,geography').split(','),
    /** 完成奖励基础分 */
    rewardScore: parseInt(process.env.DAILY_CHALLENGE_REWARD || '50', 10),
  },

  // ==================== 成就系统（未实现，预埋） ====================
  achievement: {
    /** 连续签到里程碑（天） */
    streakMilestones: [7, 30, 90, 180, 365],
    /** 总答题数里程碑 */
    totalAnswersMilestones: [100, 500, 1000, 5000, 10000],
    /** 满分次数里程碑 */
    perfectScoreMilestones: [10, 50, 100],
  },

  // ==================== 徽章系统（未实现，预埋） ====================
  badge: {
    /** 徽章解锁需要的最低连击数 */
    comboThresholds: {
      bronze: 2,
      silver: 5,
      gold: 10,
      diamond: 20,
    },
  },

  // ==================== 速率限制（未来接入 express-rate-limit） ====================
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    enabled: process.env.RATE_LIMIT_ENABLED === 'true',
  },

  // ==================== Redis（排行榜缓存/匹配系统，未接入） ====================
  redis: {
    url: process.env.REDIS_URL || '',
    enabled: !!process.env.REDIS_URL,
  },

  // ==================== 实时匹配（未实现，预埋） ====================
  matchmaking: {
    /** 匹配超时秒数 */
    timeout: parseInt(process.env.MATCHMAKING_TIMEOUT || '30', 10),
    /** 匹配池最小人数 */
    poolSize: parseInt(process.env.MATCHMAKING_POOL_SIZE || '10', 10),
    /** 段位差距阈值（用于公平匹配） */
    rankGap: parseInt(process.env.MATCHMAKING_RANK_GAP || '500', 10),
  },
} as const;
