import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import Taro from '@tarojs/taro';
import { login, getProfile, getQuestionCount, startGame, submitAnswer, setOnAuthExpired, clearToken } from '../services/api';

// ===== 状态类型 =====
export type GameStatus = 'HOME' | 'READY' | 'QUESTION' | 'REVEAL' | 'SETTLE_WIN' | 'SETTLE_LOSE';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface SubjectProgress {
  progress: 'newbie' | 'ongoing' | 'cleared';
  bestScore: number;
  currentChapter: number; // 当前章节（1-based）
}

export interface UserTitle {
  name: string;
  emoji: string;
  color: string;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  unlocked: boolean;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  totalScore: number;
  subjects: Record<string, SubjectProgress>;
  title: UserTitle;
  achievements: Achievement[];
}

export interface GameState {
  status: GameStatus;
  user: UserProfile | null;
  currentSubject: string | null;
  currentChapter: number;      // 当前章节 1~5
  difficulty: Difficulty;
  lives: number;               // 剩余生命
  combo: number;               // 当前连击
  score: number;               // 本局累计得分
  questions: any[];
  currentQuestionIndex: number;
  gameId: string | null;
  selectedOptionId: string | null;
  lastResult: {
    correct: boolean;
    correctOptionId: string;
    explanation: string;
    distribution: { optionId: string; count: number }[];
    isLastQuestion: boolean;
    eliminated: boolean;
    score: number;            // 本题得分
  } | null;
  gameResult: any | null;
  questionCount: Record<string, number>;
}

// ===== Actions =====
type Action =
  | { type: 'SET_STATUS'; payload: GameStatus }
  | { type: 'SET_USER'; payload: GameState['user'] }
  | { type: 'SELECT_SUBJECT'; payload: string }
  | { type: 'SET_DIFFICULTY'; payload: Difficulty }
  | { type: 'SET_CHAPTER'; payload: number }
  | { type: 'START_GAME'; payload: { gameId: string; questions: any[] } }
  | { type: 'SELECT_OPTION'; payload: string }
  | { type: 'REVEAL'; payload: GameState['lastResult'] }
  | { type: 'LOSE_LIFE' }
  | { type: 'INCREMENT_COMBO' }
  | { type: 'RESET_COMBO' }
  | { type: 'ADD_SCORE'; payload: number }
  | { type: 'NEXT_QUESTION' }
  | { type: 'FINISH_GAME'; payload: any }
  | { type: 'RESET' }
  | { type: 'SET_QUESTION_COUNT'; payload: Record<string, number> };

const initialState: GameState = {
  status: 'HOME',
  user: null,
  currentSubject: null,
  currentChapter: 1,
  difficulty: 'normal',
  lives: 3,
  combo: 0,
  score: 0,
  questions: [],
  currentQuestionIndex: 0,
  gameId: null,
  selectedOptionId: null,
  lastResult: null,
  gameResult: null,
  questionCount: {},
};

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SELECT_SUBJECT':
      return { ...state, currentSubject: action.payload, status: 'READY' };
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.payload };
    case 'SET_CHAPTER':
      return { ...state, currentChapter: action.payload };
    case 'START_GAME':
      return {
        ...state,
        gameId: action.payload.gameId,
        questions: action.payload.questions,
        currentQuestionIndex: 0,
        selectedOptionId: null,
        lastResult: null,
        lives: 3,
        combo: 0,
        score: 0,
      };
    case 'SELECT_OPTION':
      return { ...state, selectedOptionId: action.payload };
    case 'REVEAL':
      return { ...state, status: 'REVEAL', lastResult: action.payload };
    case 'LOSE_LIFE':
      return { ...state, lives: Math.max(0, state.lives - 1) };
    case 'INCREMENT_COMBO':
      return { ...state, combo: state.combo + 1 };
    case 'RESET_COMBO':
      return { ...state, combo: 0 };
    case 'ADD_SCORE':
      return { ...state, score: state.score + action.payload };
    case 'NEXT_QUESTION':
      if (state.currentQuestionIndex < state.questions.length - 1) {
        return {
          ...state,
          currentQuestionIndex: state.currentQuestionIndex + 1,
          selectedOptionId: null,
          lastResult: null,
          status: 'QUESTION',
        };
      }
      return state;
    case 'FINISH_GAME':
      const finalStatus = action.payload?.eliminated ? 'SETTLE_LOSE' : 'SETTLE_WIN';
      return { ...state, status: finalStatus, gameResult: action.payload };
    case 'RESET':
      return { ...initialState, user: state.user, questionCount: state.questionCount };
    case 'SET_QUESTION_COUNT':
      return { ...state, questionCount: action.payload };
    default:
      return state;
  }
}

// ===== Context =====
interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<Action>;
  doLogin: () => Promise<void>;
  doLogout: () => void;
  isLoggingIn: boolean;
  doStartGame: (subject: string, chapter?: number, difficulty?: Difficulty) => Promise<void>;
  doSubmitAnswer: (optionId: string, timeSpent: number) => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 自动登录 + session 检查
  useEffect(() => {
    const tryRestoreSession = () => {
      const token = Taro.getStorageSync('token');
      if (!token) return;

      // 先检查微信 session 是否有效
      Taro.checkSession({
        success: () => {
          // session 有效，用 token 恢复用户态
          getProfile().then((user) => {
            dispatch({ type: 'SET_USER', payload: user });
          }).catch(() => {
            // token 自身无效，清除
            clearToken();
          });
        },
        fail: () => {
          // 微信 session 过期，清除 token 等用户重新登录
          clearToken();
          dispatch({ type: 'SET_USER', payload: null });
        },
      });
    };

    tryRestoreSession();

    // 获取题库数量（无需登录态）
    getQuestionCount().then((count) => {
      dispatch({ type: 'SET_QUESTION_COUNT', payload: count });
    }).catch(() => {});
  }, []);

  // 注册全局 401 拦截回调
  useEffect(() => {
    setOnAuthExpired(() => {
      dispatch({ type: 'SET_USER', payload: null });
      Taro.showToast({ title: '登录已过期，请重新登录', icon: 'none', duration: 2000 });
    });
    return () => setOnAuthExpired(null);
  }, []);

  const doLogin = useCallback(async () => {
    if (isLoggingIn) return; // 防重复点击
    setIsLoggingIn(true);
    try {
      const data = await login();
      dispatch({ type: 'SET_USER', payload: data.user });
      Taro.showToast({ title: '登录成功', icon: 'success', duration: 1500 });
    } catch (err: any) {
      const msg = err.message || '登录失败';
      Taro.showToast({ title: msg, icon: 'none', duration: 2000 });
      // code 可能已被使用，清除可能残留的数据
      clearToken();
    } finally {
      setIsLoggingIn(false);
    }
  }, [isLoggingIn]);

  const doLogout = useCallback(() => {
    clearToken();
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'RESET' });
    Taro.showToast({ title: '已退出登录', icon: 'none', duration: 1500 });
  }, []);

  const doStartGame = async (subject: string, chapter = 1, difficulty: Difficulty = 'normal') => {
    dispatch({ type: 'SET_DIFFICULTY', payload: difficulty });
    dispatch({ type: 'SET_CHAPTER', payload: chapter });
    // 先设置 READY 状态，让 3-2-1 倒计时准备就绪
    dispatch({ type: 'SELECT_SUBJECT', payload: subject });
    Taro.navigateTo({ url: '/pages/quiz/index' });
    setIsLoggingIn(true); // 复用为 loading
    try {
      const data = await startGame(subject, chapter, difficulty);
      dispatch({ type: 'START_GAME', payload: data });
    } catch (err: any) {
      Taro.showToast({ title: err.message || '开始游戏失败', icon: 'none' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const doSubmitAnswer = async (optionId: string, timeSpent: number) => {
    if (!state.gameId || !state.questions[state.currentQuestionIndex]) return;
    const questionId = state.questions[state.currentQuestionIndex].id;
    try {
      const result = await submitAnswer(state.gameId!, questionId, optionId, timeSpent);
      dispatch({ type: 'REVEAL', payload: result });
    } catch (err: any) {
      Taro.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  };

  return (
    <GameContext.Provider value={{ state, dispatch, doLogin, doLogout, isLoggingIn, doStartGame, doSubmitAnswer }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
