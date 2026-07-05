import Taro from '@tarojs/taro';

const BASE_URL = 'https://game.chaogetalks.com';

// ===== 鉴权过期回调（由 gameContext 注册） =====
let onAuthExpired: (() => void) | null = null;
export function setOnAuthExpired(fn: (() => void) | null) {
  onAuthExpired = fn;
}

// ===== 获取微信登录 code =====
export function wxLogin(): Promise<string> {
  return new Promise((resolve, reject) => {
    Taro.login({
      success: (res) => resolve(res.code),
      fail: (err) => reject(err),
    });
  });
}

// ===== Token 工具 =====
function getToken(): string | undefined {
  try {
    return Taro.getStorageSync('token');
  } catch {
    return undefined;
  }
}

export function hasToken(): boolean {
  return !!getToken();
}

export function clearToken(): void {
  Taro.removeStorageSync('token');
}

// ===== 通用请求封装（自动注入 token + 401 拦截） =====
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
}

async function request(path: string, options: RequestOptions = {}): Promise<any> {
  const { method = 'GET', data } = options;
  const header: any = { 'Content-Type': 'application/json' };

  // 自动从 Storage 注入 token
  const token = getToken();
  if (token) header['Authorization'] = `Bearer ${token}`;

  const res = await Taro.request({
    url: `${BASE_URL}${path}`,
    method,
    data,
    header,
  });

  // 401 拦截：token 过期，清除并通知 Context 重置用户态
  if (res.statusCode === 401) {
    clearToken();
    onAuthExpired?.();
    throw new Error('登录已过期，请重新登录');
  }

  if (res.statusCode >= 400) {
    throw new Error(res.data?.error || '请求失败');
  }
  return res.data;
}

// ===== API 方法 =====

// 微信登录
export async function login(): Promise<{ token: string; user: any }> {
  const code = await wxLogin();
  const data = await request('/api/user/login', { method: 'POST', data: { code } });
  // 保存 token
  Taro.setStorageSync('token', data.token);
  return data;
}

// 获取用户资料
export async function getProfile(): Promise<any> {
  return request('/api/user/profile');
}

// 更新用户资料（昵称等）
export async function updateProfile(data: { nickname: string }): Promise<any> {
  return request('/api/user/profile', { method: 'PUT', data });
}

// 开始游戏(选学科、章节、难度后调用)
export async function startGame(
  subject: string,
  chapter: number,
  difficulty: string
): Promise<{ gameId: string; questions: any[] }> {
  return request('/api/game/start', { method: 'POST', data: { subject, chapter, difficulty } });
}

// 提交答案
export async function submitAnswer(
  gameId: string,
  questionId: string,
  optionId: string,
  timeSpent: number
): Promise<any> {
  return request('/api/game/submit', {
    method: 'POST',
    data: { gameId, questionId, optionId, timeSpent },
  });
}

// 获取游戏结果
export async function getGameResult(gameId: string): Promise<any> {
  return request(`/api/game/result/${gameId}`);
}

// 获取题库统计
export async function getQuestionCount(): Promise<Record<string, number>> {
  return request('/api/questions/count');
}

// 获取最近游戏记录
export async function getRecentGames(): Promise<{ list: any[] }> {
  return request('/api/game/recent');
}

// ===== 排行榜 API =====

// 获取排行榜
export async function getLeaderboard(subject?: string, limit = 20): Promise<{ list: any[] }> {
  const params = new URLSearchParams();
  if (subject) params.append('subject', subject);
  params.append('limit', String(limit));
  return request(`/api/leaderboard?${params.toString()}`);
}

// 获取当前用户排名
export async function getMyRank(subject?: string): Promise<{ rank: number; totalScore: number }> {
  const params = subject ? `?subject=${subject}` : '';
  return request(`/api/leaderboard/me${params}`);
}

// 获取全局统计
export async function getGlobalStats(): Promise<{ totalUsers: number; totalGames: number; todayGames: number; todayUsers: number }> {
  return request('/api/leaderboard/stats');
}

// ===== 每日挑战 API =====

// 获取每日挑战
export async function getDailyChallenge(): Promise<{ today: any; history: any[]; streak: number }> {
  return request('/api/challenge/daily');
}

// 完成每日挑战
export async function completeDailyChallenge(score: number, questionsAnswered: number): Promise<any> {
  return request('/api/challenge/daily/complete', {
    method: 'POST',
    data: { score, questionsAnswered },
  });
}

// 获取挑战统计
export async function getChallengeStats(): Promise<{ totalChallenges: number; streak: number; history: any[] }> {
  return request('/api/challenge/stats');
}

// ===== 积分商城 API =====

// 获取商品列表
export async function getShopItems(): Promise<any[]> {
  return request('/api/shop/items');
}

// 兑换商品
export async function redeemItem(itemId: string): Promise<{ success: boolean; message: string; remainingScore: number }> {
  return request('/api/shop/redeem', { method: 'POST', data: { itemId } });
}

// 获取背包物品数量
export async function getBackpackCount(): Promise<{ count: number }> {
  return request('/api/shop/backpack/count');
}

// 获取背包物品列表
export async function getBackpack(): Promise<any[]> {
  return request('/api/shop/backpack');
}

// 核销（父母确认）
export async function verifyRedemption(redemptionId: string): Promise<{ success: boolean; message: string }> {
  return request(`/api/shop/verify/${redemptionId}`, { method: 'POST' });
}

// 获取兑换历史
export async function getRedemptionHistory(): Promise<any[]> {
  return request('/api/shop/history');
}
