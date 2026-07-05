// 学科配置
export const SUBJECT_CONFIG = {
  chinese: {
    label: '语文',
    gradient: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
    icon: 'wenzi',
  },
  math: {
    label: '数学',
    gradient: 'linear-gradient(135deg, #4B8BFF, #7C5CFF)',
    icon: 'shuxue',
  },
  english: {
    label: '英语',
    gradient: 'linear-gradient(135deg, #A855F7, #EC4899)',
    icon: 'yingyu',
  },
  science: {
    label: '科学',
    gradient: 'linear-gradient(135deg, #10B981, #06B6D4)',
    icon: 'kexue',
  },
  history: {
    label: '历史',
    gradient: 'linear-gradient(135deg, #F59E0B, #F97316)',
    icon: 'lishi',
  },
  geography: {
    label: '地理',
    gradient: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
    icon: 'dili',
  },
};

export const SUBJECT_ORDER = ['chinese', 'math', 'english', 'science', 'history', 'geography'];

// 状态映射
export const PROGRESS_LABEL: Record<string, string> = {
  locked: '未解锁',
  newbie: '未开始',
  ongoing: '进行中',
  cleared: '已通关',
};

// 进度标签颜色
export const PROGRESS_COLOR: Record<string, string> = {
  locked: '#9CA3AF',
  newbie: '#7C5CFF',
  ongoing: '#F59E0B',
  cleared: '#22C55E',
};

// 状态中文名
export const STATUS_TEXT: Record<string, string> = {
  HOME: '首页',
  READY: '准备',
  QUESTION: '答题中',
  REVEAL: '揭晓',
  SETTLE_WIN: '通关',
  SETTLE_LOSE: '淘汰',
};

// ===== 难度配置 =====
export const DIFFICULTY_CONFIG = {
  easy:   { label: '简单', time: 15, baseScore: 100, color: '#10b981', shadow: 'rgba(16,185,129,0.4)' },
  normal: { label: '普通', time: 12, baseScore: 150, color: '#f59e0b', shadow: 'rgba(245,158,11,0.4)' },
  hard:   { label: '困难', time: 8,  baseScore: 200, color: '#ef4444', shadow: 'rgba(239,68,68,0.4)' },
} as const;
export type Difficulty = keyof typeof DIFFICULTY_CONFIG;

// ===== 章节配置（每章 10 题）=====
export const CHAPTER_QUESTIONS = 10;
export const MAX_CHAPTER = 5; // 每学科最多 5 章

// ===== 生命/HP 配置 =====
export const MAX_LIVES = 3;

// ===== 计分配置 =====
export const SCORING_CONFIG = {
  timeBonusPerSecond: 10,   // 每秒剩余时间加分
  comboMultiplier: {
    1: 1,
    2: 1.5,
    3: 2,
    5: 3,
    10: 5,
  } as Record<number, number>,
  minTimeBonus: 5,
};

/** 获取 combo 倍率 */
export function getComboMultiplier(combo: number): number {
  const thresholds = Object.keys(SCORING_CONFIG.comboMultiplier)
    .map(Number)
    .sort((a, b) => b - a); // 降序
  for (const t of thresholds) {
    if (combo >= t) return SCORING_CONFIG.comboMultiplier[t];
  }
  return 1;
}

// ===== Combo 弹出配置 =====
export const COMBO_POPUP = {
  minCombo: 2, // combo≥2 弹出
  labels: {
    2: { text: '连击！',   sub: '手感来了',  emoji: '🔥', level: 'normal' },
    3: { text: '暴走！',   sub: '根本停不下来', emoji: '💥', level: 'fire' },
    5: { text: '超神！',   sub: '无人能挡',   emoji: '⚡', level: 'critical' },
    10: { text: '神一般的操作！', sub: '你已经无敌了', emoji: '👑', level: 'godlike' },
  } as Record<number, { text: string; sub: string; emoji: string; level: string }>,
};

// 游戏配置
export const TOTAL_QUESTIONS = 10;
export const COUNTDOWN_SECONDS = 15;
export const REVEAL_SECONDS = 3;
export const READY_COUNTDOWN = 3;
