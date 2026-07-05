import Taro from '@tarojs/taro';

const BASE_URL = 'https://game.chaogetalks.com';

// 获取微信登录 code
export function wxLogin(): Promise<string> {
  return new Promise((resolve, reject) => {
    Taro.login({
      success: (res) => resolve(res.code),
      fail: (err) => reject(err),
    });
  });
}

// 通用请求封装
interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  data?: any;
  token?: string;
}

async function request(path: string, options: RequestOptions = {}): Promise<any> {
  const { method = 'GET', data, token } = options;
  const header: any = { 'Content-Type': 'application/json' };
  if (token) header['Authorization'] = `Bearer ${token}`;

  const res = await Taro.request({
    url: `${BASE_URL}${path}`,
    method,
    data,
    header,
  });

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
  const token = Taro.getStorageSync('token');
  return request('/api/user/profile', { token });
}

// 开始游戏(选学科后调用)
export async function startGame(subject: string): Promise<{ gameId: string; questions: any[] }> {
  const token = Taro.getStorageSync('token');
  return request('/api/game/start', { method: 'POST', data: { subject }, token });
}

// 提交答案
export async function submitAnswer(
  gameId: string,
  questionId: string,
  optionId: string,
  timeSpent: number
): Promise<any> {
  const token = Taro.getStorageSync('token');
  return request('/api/game/submit', {
    method: 'POST',
    data: { gameId, questionId, optionId, timeSpent },
    token,
  });
}

// 获取游戏结果
export async function getGameResult(gameId: string): Promise<any> {
  const token = Taro.getStorageSync('token');
  return request(`/api/game/result/${gameId}`, { token });
}

// 获取题库统计
export async function getQuestionCount(): Promise<Record<string, number>> {
  return request('/api/questions/count');
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
  const token = Taro.getStorageSync('token');
  const params = subject ? `?subject=${subject}` : '';
  return request(`/api/leaderboard/me${params}`, { token });
}

// 获取全局统计
export async function getGlobalStats(): Promise<{ totalUsers: number; totalGames: number; todayGames: number; todayUsers: number }> {
  return request('/api/leaderboard/stats');
}

// ===== 每日挑战 API =====

// 获取每日挑战
export async function getDailyChallenge(): Promise<{ today: any; history: any[]; streak: number }> {
  const token = Taro.getStorageSync('token');
  return request('/api/challenge/daily', { token });
}

// 完成每日挑战
export async function completeDailyChallenge(score: number, questionsAnswered: number): Promise<any> {
  const token = Taro.getStorageSync('token');
  return request('/api/challenge/daily/complete', {
    method: 'POST',
    data: { score, questionsAnswered },
    token,
  });
}

// 获取挑战统计
export async function getChallengeStats(): Promise<{ totalChallenges: number; streak: number; history: any[] }> {
  const token = Taro.getStorageSync('token');
  return request('/api/challenge/stats', { token });
}
