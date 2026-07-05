import { IQuestion } from '../models/Question';

/** 房间状态 */
export type RoomStatus = 'waiting' | 'playing' | 'finished' | 'cancelled';

/** 单次答题结果 */
export interface BattleAnswer {
  questionIndex: number;
  questionId: string;
  optionId: string;
  correct: boolean;
  score: number;
  combo: number;
  timeSpent: number; // 秒
}

/** 玩家信息 */
export interface BattlePlayer {
  userId: string;
  nickname: string;
  avatar: string;
  socketId: string;
  answers: BattleAnswer[];
  finished: boolean;
}

/** 房间 */
export interface BattleRoom {
  roomCode: string;
  hostId: string;
  guestId: string | null;
  subject: string;
  chapter: number;
  difficulty: string;
  totalQuestions: number;
  questions: QuestionWithAnswer[];
  status: RoomStatus;
  createdAt: Date;
}

/** 带正确答案的题目（发给客户端时去掉 correctId） */
export interface QuestionWithAnswer {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctId: string;
  explanation: string;
  difficulty: number;
}
