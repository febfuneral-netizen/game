/**
 * QuizBattle WebSocket Service
 * 基于 weapp.socket.io（兼容微信小程序 Socket.IO 客户端）
 * 服务器端使用 socket.io@2.x（与 weapp.socket.io 兼容）
 */
import Taro from '@tarojs/taro';
import io from 'weapp.socket.io';

// Socket.IO 服务端地址
const SOCKET_URL = 'https://game.chaogetalks.com';
const SOCKET_PATH = '/ws';

/** 获取本地存储的 JWT token */
function getToken(): string {
  try {
    return Taro.getStorageSync('token') || '';
  } catch {
    return '';
  }
}

export interface RoomCreatedData {
  roomCode: string;
  subject: string;
  chapter: number;
  difficulty: string;
  totalQuestions: number;
  gameTime: number;
}

export interface OpponentInfo {
  id: string;
  nickname: string;
  avatar: string;
}

export interface QuestionData {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  difficulty: number;
}

export interface StartGameData {
  gameTime: number;
  totalQuestions: number;
  questions: QuestionData[];
  opponent: OpponentInfo | null;
}

export interface AnswerResultData {
  questionId: string;
  correct: boolean;
  score: number;
  combo: number;
}

export interface OpponentProgressData {
  questionIndex: number;
  status: string;
}

export interface GameResultData {
  players: {
    userId: string;
    nickname: string;
    avatar: string;
    score: number;
    correctCount: number;
    maxCombo: number;
    totalQuestions: number;
    details?: any[];
  }[];
  winner: string | null;
  questionResults: {
    questionId: string;
    correctId: string;
    explanation: string;
  }[];
}

/** Socket 事件回调 */
export interface SocketCallbacks {
  onHi?: (data: any) => void;
  onRoomCreated?: (data: RoomCreatedData) => void;
  onRoomJoined?: (data: RoomCreatedData & { opponent: OpponentInfo | null }) => void;
  onOpponentJoined?: (data: { opponent: OpponentInfo }) => void;
  onStart?: (data: StartGameData) => void;
  onAnswerResult?: (data: AnswerResultData) => void;
  onOpponentProgress?: (data: OpponentProgressData) => void;
  onYouFinished?: (data: { message: string }) => void;
  onOpponentFinished?: (data: { message: string }) => void;
  onGameResult?: (data: GameResultData) => void;
  onOpponentLeft?: (data: { message: string }) => void;
  onError?: (data: { message: string }) => void;
  onDisconnect?: (reason: string) => void;
  onConnect?: () => void;
}

class QuizBattleSocket {
  private socket: any = null;
  private callbacks: SocketCallbacks = {};

  /** 连接到服务器 */
  connect(callbacks: SocketCallbacks): Promise<void> {
    this.callbacks = callbacks;

    const token = getToken();
    if (!token) {
      return Promise.reject(new Error('未登录'));
    }

    // 断开旧连接，确保每次 create/join 都是全新连接
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch {}
      this.socket = null;
    }

    return new Promise((resolve, reject) => {
      let settled = false;

      // 总超时保护：18 秒后如果还没连上就 reject
      const guardTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        if (this.socket) {
          try { this.socket.disconnect(); } catch {}
          this.socket = null;
        }
        reject(new Error('连接超时\n\n可能原因：\n1. 请确认微信后台已配置 Socket 合法域名 wss://game.chaogetalks.com\n2. 真机调试请确保右上角菜单已「打开调试」\n3. 检查手机网络是否正常'));
      }, 18000);

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(guardTimer);
        fn();
      };

      try {
        // 微信小程序 WebSocket 连接
        // 注意：必须在微信公众后台「开发 → 开发管理 → 开发设置 → Socket 合法域名」中
        // 添加 wss://game.chaogetalks.com，否则真机/体验版会连接失败
        // 连接 /battle 命名空间（与后端 socket.io Namespace 对应）
        this.socket = io(SOCKET_URL + '/battle', {
          path: SOCKET_PATH,
          query: { token },
          transports: ['websocket'],  // 微信小程序仅用 WebSocket（polling 也走 wx.connectSocket）
          timeout: 25000,
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5,
          forceNew: true,
        });

        this.socket.on('connect', () => {
          finish(() => {
            callbacks.onConnect?.();
            resolve();
          });
        });

        this.socket.on('connect_error', (err: any) => {
          console.error('[Socket] connect_error:', JSON.stringify(err));
          // 只把第一次 connect_error 当作失败
          if (!settled && !this.socket?.connected) {
            finish(() => {
              const errDetail = err?.message || err?.description || err?.type || '';
              const msg = errDetail.includes('url not in domain list')
                ? 'Socket域名未配置\n请在微信后台添加 wss://game.chaogetalks.com'
                : errDetail.includes('timeout')
                  ? '网络超时，请检查手机网络'
                  : `连接失败: ${errDetail || '未知错误'}`;
              reject(new Error(msg));
            });
          }
        });

        this.socket.on('disconnect', (reason: string) => {
          callbacks.onDisconnect?.(reason);
        });

        // 注册服务端推送事件
        this.socket.on('hi', (data: any) => callbacks.onHi?.(data));
        this.socket.on('room_created', (data: RoomCreatedData) => callbacks.onRoomCreated?.(data));
        this.socket.on('room_joined', (data: any) => callbacks.onRoomJoined?.(data));
        this.socket.on('opponent_joined', (data: { opponent: OpponentInfo }) => callbacks.onOpponentJoined?.(data));
        this.socket.on('start', (data: StartGameData) => callbacks.onStart?.(data));
        this.socket.on('answer_result', (data: AnswerResultData) => callbacks.onAnswerResult?.(data));
        this.socket.on('opponent_progress', (data: OpponentProgressData) => callbacks.onOpponentProgress?.(data));
        this.socket.on('you_finished', (data: { message: string }) => callbacks.onYouFinished?.(data));
        this.socket.on('opponent_finished', (data: { message: string }) => callbacks.onOpponentFinished?.(data));
        this.socket.on('game_result', (data: GameResultData) => callbacks.onGameResult?.(data));
        this.socket.on('opponent_left', (data: { message: string }) => callbacks.onOpponentLeft?.(data));
        this.socket.on('error_msg', (data: { message: string }) => callbacks.onError?.(data));
      } catch (err: any) {
        finish(() => reject(err));
      }
    });
  }

  /** 创建房间 */
  createRoom(subject: string, chapter: number, difficulty: string) {
    this.socket?.emit('create_room', { subject, chapter, difficulty });
  }

  /** 加入房间 */
  joinRoom(roomCode: string) {
    this.socket?.emit('join_room', { roomCode: roomCode.toUpperCase() });
  }

  /** 提交答案 */
  submitAnswer(questionId: string, optionId: string, timeSpent: number, questionIndex: number) {
    this.socket?.emit('answer', { questionId, optionId, timeSpent, questionIndex });
  }

  /** 离开房间 */
  leaveRoom() {
    this.socket?.emit('leave_room');
  }

  /** 断开连接 */
  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /** 是否已连接 */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

/** 单例 */
export const battleSocket = new QuizBattleSocket();
