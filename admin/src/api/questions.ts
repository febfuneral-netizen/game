import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
});

// 请求拦截：自动带 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：401 跳登录
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  },
);

// ==================== 用户 ====================

export async function login(nickname: string, avatarUrl?: string) {
  const { data } = await api.post('/api/user/login', { nickname, avatarUrl });
  if (data.token) {
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
  }
  return data;
}

// ==================== 题库 CRUD ====================

export interface Question {
  _id?: string;
  subject: string;
  chapter?: number;
  difficulty: 1 | 2 | 3;
  type: 'single';
  text: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
}

export interface QuestionQuery {
  subject?: string;
  difficulty?: number;
  chapter?: number;
  limit?: number;
  skip?: number;
}

// 查询题目（管理员用，含 correctId）
export async function getQuestions(params: QuestionQuery) {
  const { data } = await api.get('/api/questions', {
    params: { ...params, admin: '1' },
  });
  return data as Question[];
}

// 统计各科题目数
export async function getQuestionCount() {
  const { data } = await api.get('/api/questions/count');
  return data as Record<string, number>;
}

// 添加题目（支持单个或数组）
export async function createQuestions(questions: Question | Question[]) {
  const { data } = await api.post('/api/questions', questions);
  return data;
}

// 删除题目
export async function deleteQuestion(id: string) {
  const { data } = await api.delete(`/api/questions/${id}`);
  return data;
}
