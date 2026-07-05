import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { login, getProfile, getQuestionCount, startGame, submitAnswer } from '../services/api';

// ===== 状态类型 =====
export type GameStatus = 'HOME' | 'READY' | 'QUESTION' | 'REVEAL' | 'SETTLE_WIN' | 'SETTLE_LOSE';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface SubjectProgress {
  progress: 'locked' | 'newbie' | 'ongoing' | 'cleared';
  bestScore: number;
  currentChapter: number; // 当前章节（1-based）
}

export interface GameState {
  status: GameStatus;
  user: { id: string; nickname: string; avatar: string; totalScore: number; subjects: Record<string, SubjectProgress> } | null;
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
  doStartGame: (subject: string, chapter?: number, difficulty?: Difficulty) => Promise<void>;
  doSubmitAnswer: (optionId: string, timeSpent: number) => Promise<void>;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [loading, setLoading] = useState(false);

  // 自动登录
  useEffect(() => {
    const token = Taro.getStorageSync('token');
    if (token) {
      getProfile().then((user) => {
        dispatch({ type: 'SET_USER', payload: user });
      }).catch(() => {
        Taro.removeStorageSync('token');
      });
    }
    // 获取题库数量
    getQuestionCount().then((count) => {
      dispatch({ type: 'SET_QUESTION_COUNT', payload: count });
    }).catch(() => {});
  }, []);

  const doLogin = async () => {
    setLoading(true);
    try {
      const data = await login();
      dispatch({ type: 'SET_USER', payload: data.user });
    } catch (err: any) {
      Taro.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const doStartGame = async (subject: string, chapter = 1, difficulty: Difficulty = 'normal') => {
    dispatch({ type: 'SET_DIFFICULTY', payload: difficulty });
    dispatch({ type: 'SET_CHAPTER', payload: chapter });
    // 先设置 READY 状态，让 3-2-1 倒计时准备就绪
    dispatch({ type: 'SELECT_SUBJECT', payload: subject });
    Taro.navigateTo({ url: '/pages/quiz/index' });
    setLoading(true);
    try {
      const data = await startGame(subject);
      // 题目加载完成后设置到状态中，此时 quiz 页 READY 倒计时已运行
      dispatch({ type: 'START_GAME', payload: data });
    } catch (err: any) {
      Taro.showToast({ title: err.message || '开始游戏失败', icon: 'none' });
    } finally {
      setLoading(false);
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
    <GameContext.Provider value={{ state, dispatch, doLogin, doStartGame, doSubmitAnswer }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
