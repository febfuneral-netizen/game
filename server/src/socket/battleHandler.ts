/**
 * QuizBattle WebSocket 服务 — 房间管理 + 实时对战
 *
 * 参考成熟开源项目（Rocket.Chat 命名空间隔离, Socket.io 官方最佳实践）
 * 协议：socket.io@2.5.0（EIO v3），与前端 weapp.socket.io@2.2.1 兼容
 * 鉴权：socket.handshake.query.token（JWT）+ 断线重连去重
 */
import jwt from 'jsonwebtoken';
import Question from '../models/Question';
import User from '../models/User';
import { config } from '../config';
import {
  BattleRoom,
  BattleAnswer,
  QuestionWithAnswer,
} from './battleTypes';

// ==================== 游戏参数 ====================

const GAME_CONFIG = {
  TOTAL_QUESTIONS: 5,         // 每局题数
  TIME_PER_QUESTION: 30,       // 每题限时（秒）
  ROOM_CLEANUP_MS: 30 * 60_000, // 房间过期时间 30min
  RESULT_CLEANUP_MS: 60_000,   // 结算后保留 1min
  MAX_EVENTS_PER_SEC: 10,      // 每秒最大事件数（防刷）
};

/** 错误码（便于前端区分） */
const ERR = {
  AUTH_FAILED: 'AUTH_FAILED',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  ROOM_SELF_JOIN: 'ROOM_SELF_JOIN',
  GAME_STARTED: 'GAME_STARTED',
  GAME_NOT_PLAYING: 'GAME_NOT_PLAYING',
  QUESTION_MISMATCH: 'QUESTION_MISMATCH',
  NOT_ENOUGH_QUESTIONS: 'NOT_ENOUGH_QUESTIONS',
  RATE_LIMIT: 'RATE_LIMIT',
};

// ==================== 全局状态 ====================

/** 活跃房间列表 */
const rooms = new Map<string, BattleRoom>();

/** socketId → userId */
const socketUsers = new Map<string, string>();

/** userId → { nickname, avatar } */
const userCache = new Map<string, { nickname: string; avatar: string }>();

/** userId → 最近活跃的 socketId（用于断线重连去重） */
const userActiveSocket = new Map<string, string>();

/** socketId → 事件时间戳队列（限流） */
const socketEventLog = new Map<string, number[]>();

// ==================== 工具函数 ====================

/** 生成4位房间码（字母+数字，避免混淆字符） */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

/** 简易限流：每秒最多 MAX_EVENTS_PER_SEC 次 */
function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  const log = socketEventLog.get(socketId) || [];
  // 清理 1 秒前的记录
  const recent = log.filter((t) => now - t < 1000);
  if (recent.length >= GAME_CONFIG.MAX_EVENTS_PER_SEC) {
    return false;
  }
  recent.push(now);
  socketEventLog.set(socketId, recent);
  return true;
}

/** 定期清理闲置的限流日志 */
setInterval(() => {
  const now = Date.now();
  for (const [sid, log] of socketEventLog) {
    const recent = log.filter((t) => now - t < 1000);
    if (recent.length === 0) socketEventLog.delete(sid);
    else socketEventLog.set(sid, recent);
  }
}, 60_000);

/** 从数据库随机抽取题目 */
async function pickQuestions(
  subject: string,
  chapter: number,
  difficulty: string,
  count: number,
): Promise<QuestionWithAnswer[]> {
  const diffMap: Record<string, number> = { easy: 1, normal: 2, hard: 3, '1': 1, '2': 2, '3': 3 };
  const diffNum = diffMap[difficulty] || 2;

  const filter: any = { subject };
  if (chapter) filter.chapter = chapter;
  if (diffNum) filter.difficulty = diffNum;

  // 先用 aggregate 随机采样，不够时忽略 chapter
  let questions = await Question.aggregate([
    { $match: filter },
    { $sample: { size: count } },
  ]);

  if (questions.length < count && chapter > 0) {
    // 放宽：同科目同难度，不限章节
    const looseFilter: any = { subject, difficulty: diffNum };
    const existingIds = questions.map((q: any) => q._id.toString());
    const more = await Question.aggregate([
      { $match: { ...looseFilter, _id: { $nin: existingIds.map((id: string) => new (require('mongoose').Types.ObjectId)(id)) } } },
      { $sample: { size: count - questions.length } },
    ]);
    questions = questions.concat(more);
  }

  // 如果还是不够，不限难度
  if (questions.length < count) {
    const existingIds = questions.map((q: any) => q._id.toString());
    const more = await Question.aggregate([
      { $match: { subject, _id: { $nin: existingIds.map((id: string) => new (require('mongoose').Types.ObjectId)(id)) } } },
      { $sample: { size: count - questions.length } },
    ]);
    questions = questions.concat(more);
  }

  return questions.map((q: any) => ({
    id: q._id.toString(),
    text: q.text,
    options: q.options,
    correctId: q.correctId,
    explanation: q.explanation || '',
    difficulty: q.difficulty,
  }));
}

/** 获取用户信息（带缓存） */
async function getUserInfo(userId: string): Promise<{ nickname: string; avatar: string }> {
  if (userCache.has(userId)) return userCache.get(userId)!;
  try {
    const user = await User.findById(userId).select('nickname avatar').lean();
    const info = { nickname: user?.nickname || '玩家', avatar: user?.avatar || '' };
    userCache.set(userId, info);
    return info;
  } catch {
    return { nickname: '玩家', avatar: '' };
  }
}

/** 计算得分 */
function calcScore(isCorrect: boolean, timeSpent: number, combo: number): number {
  if (!isCorrect) return 0;
  const base = 100;
  const timeBonus = Math.max(0, Math.floor((15 - timeSpent) * 3)); // 15秒内答对加分，最多+45
  const comboMultiplier = 1 + Math.floor(combo / 3) * 0.2; // 每3连击+20%分
  return Math.floor((base + timeBonus) * comboMultiplier);
}

/** 根据 userId 找 socketId */
function getPlayerSocketId(userId: string): string {
  for (const [sid, uid] of socketUsers) {
    if (uid === userId) return sid;
  }
  return '';
}

/** 清理过期房间（每5分钟） */
function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const age = now - room.createdAt.getTime();
    if (age > GAME_CONFIG.ROOM_CLEANUP_MS || room.status === 'cancelled') {
      rooms.delete(code);
      console.log(`[Housekeeping] 清理房间 ${code}`);
    }
  }
}
setInterval(cleanupRooms, 5 * 60 * 1000);

// ==================== Socket.IO 处理器 ====================

/**
 * 注册对战事件处理器
 * @param io     主 Socket.IO 实例（用于跨命名空间广播，如通知全局对手上线）
 * @param nsp    对战命名空间 /battle
 */
export function setupBattleSocket(io: SocketIO.Server, nsp: SocketIO.Namespace) {
  // ========== 鉴权中间件 ==========
  // 参考 Rocket.Chat 模式：JWT + Cookie fallback
  nsp.use(async (socket, next) => {
    const token = socket.handshake.query.token;

    if (!token) {
      return next(new Error(JSON.stringify({ code: ERR.AUTH_FAILED, message: '未提供认证token' })));
    }

    try {
      const decoded = jwt.verify(token as string, config.jwtSecret) as { userId: string };
      const userId = decoded.userId;

      // 同一用户重连时，踢掉旧连接（避免同一账户双开对战）
      const oldSocketId = userActiveSocket.get(userId);
      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSocket = nsp.connected[oldSocketId];
        if (oldSocket) {
          console.log(`[Socket] 踢掉旧连接 userId=${userId} oldSid=${oldSocketId}`);
          oldSocket.emit('kicked', { reason: '账号在其他设备登录' });
          oldSocket.disconnect(true);
        }
      }

      (socket as any).userId = userId;
      socketUsers.set(socket.id, userId);
      userActiveSocket.set(userId, socket.id);
      next();
    } catch {
      next(new Error(JSON.stringify({ code: ERR.AUTH_FAILED, message: 'Token无效或已过期' })));
    }
  });

  nsp.on('connection', (socket) => {
    const userId: string = (socket as any).userId;
    console.log(`[Socket] 用户连接 /battle: ${userId} (sid=${socket.id})`);

    // 连接问候
    socket.emit('hi', { message: '连接成功', userId });

    // ========== 创建房间 ==========
    socket.on('create_room', async (data: { subject: string; chapter: number; difficulty: string }) => {
      if (!checkRateLimit(socket.id)) {
        return socket.emit('error_msg', { code: ERR.RATE_LIMIT, message: '操作过于频繁，请稍后再试' });
      }

      try {
        const { subject = 'math', chapter = 1, difficulty = 'normal' } = data || {};
        const roomCode = generateRoomCode();

        const questions = await pickQuestions(subject, chapter, difficulty, GAME_CONFIG.TOTAL_QUESTIONS);

        if (questions.length < 3) {
          socket.emit('error_msg', { code: ERR.NOT_ENOUGH_QUESTIONS, message: '题库中该分类题目不足，无法创建房间' });
          return;
        }

        const room: BattleRoom = {
          roomCode,
          hostId: userId,
          guestId: null,
          subject,
          chapter,
          difficulty,
          totalQuestions: questions.length,
          questions,
          status: 'waiting',
          createdAt: new Date(),
        };

        rooms.set(roomCode, room);
        socket.join(roomCode);
        (socket as any).roomCode = roomCode;

        const userInfo = await getUserInfo(userId);

        socket.emit('room_created', {
          roomCode,
          subject,
          chapter,
          difficulty,
          totalQuestions: questions.length,
          gameTime: GAME_CONFIG.TIME_PER_QUESTION,
          host: { userId, nickname: userInfo.nickname, avatar: userInfo.avatar },
        });

        console.log(`[Room] 房间 ${roomCode} 已创建 host=${userId} 题目=${questions.length}`);
      } catch (err: any) {
        console.error('[Room] 创建房间失败:', err);
        socket.emit('error_msg', { code: 'SERVER_ERROR', message: '创建房间失败：' + err.message });
      }
    });

    // ========== 加入房间 ==========
    socket.on('join_room', async (data: { roomCode: string }) => {
      if (!checkRateLimit(socket.id)) {
        return socket.emit('error_msg', { code: ERR.RATE_LIMIT, message: '操作过于频繁' });
      }

      try {
        const { roomCode } = data;
        const room = rooms.get(roomCode);

        if (!room) {
          return socket.emit('error_msg', { code: ERR.ROOM_NOT_FOUND, message: '房间不存在或已过期' });
        }
        if (room.guestId) {
          return socket.emit('error_msg', { code: ERR.ROOM_FULL, message: '房间已满' });
        }
        if (room.hostId === userId) {
          return socket.emit('error_msg', { code: ERR.ROOM_SELF_JOIN, message: '不能加入自己创建的房间' });
        }
        if (room.status !== 'waiting') {
          return socket.emit('error_msg', { code: ERR.GAME_STARTED, message: '游戏已经开始' });
        }

        room.guestId = userId;
        socket.join(roomCode);
        (socket as any).roomCode = roomCode;

        const [hostInfo, guestInfo] = await Promise.all([
          getUserInfo(room.hostId),
          getUserInfo(userId),
        ]);

        // 通知加入者
        socket.emit('room_joined', {
          roomCode,
          subject: room.subject,
          chapter: room.chapter,
          difficulty: room.difficulty,
          totalQuestions: room.totalQuestions,
          gameTime: GAME_CONFIG.TIME_PER_QUESTION,
          opponent: { userId: room.hostId, nickname: hostInfo.nickname, avatar: hostInfo.avatar },
        });

        // 通知房主：对手已加入
        const hostSid = getPlayerSocketId(room.hostId);
        if (hostSid) {
          nsp.to(hostSid).emit('opponent_joined', {
            opponent: { userId, nickname: guestInfo.nickname, avatar: guestInfo.avatar },
          });
        }

        // 双方到齐 → 开始
        room.status = 'playing';
        await startGame(room, nsp);

        console.log(`[Room] ${userId} 加入房间 ${roomCode} 对战开始`);
      } catch (err: any) {
        console.error('[Room] 加入房间失败:', err);
        socket.emit('error_msg', { code: 'SERVER_ERROR', message: '加入房间失败' });
      }
    });

    // ========== 提交答案 ==========
    socket.on('answer', async (data: { questionId: string; optionId: string; timeSpent: number; questionIndex: number }) => {
      if (!checkRateLimit(socket.id)) return;

      try {
        const { questionId, optionId, timeSpent, questionIndex } = data;
        const roomCode = (socket as any).roomCode;
        const room = rooms.get(roomCode);

        if (!room) {
          return socket.emit('error_msg', { code: ERR.ROOM_NOT_FOUND, message: '房间不存在' });
        }
        if (room.status !== 'playing') {
          return socket.emit('error_msg', { code: ERR.GAME_NOT_PLAYING, message: '游戏未在进行中' });
        }

        const question = room.questions[questionIndex];
        if (!question || question.id !== questionId) {
          return socket.emit('error_msg', { code: ERR.QUESTION_MISMATCH, message: '题目不匹配' });
        }

        const isCorrect = question.correctId === optionId;

        // 计算 combo
        const playerAnswers: BattleAnswer[] = (room as any)._answers?.get(userId) || [];
        const combo = isCorrect
          ? (playerAnswers.filter((a) => a.correct).length) + 1
          : 0;
        const score = calcScore(isCorrect, timeSpent, combo);

        const answer: BattleAnswer = {
          questionIndex,
          questionId,
          optionId,
          correct: isCorrect,
          score,
          combo,
          timeSpent,
        };

        // 保存答案
        if (!(room as any)._answers) (room as any)._answers = new Map();
        if (!(room as any)._answers.has(userId)) (room as any)._answers.set(userId, []);
        (room as any)._answers.get(userId).push(answer);

        // 回复答题者
        socket.emit('answer_result', { questionId, correct: isCorrect, score, combo });

        // 通知对手进度
        const opponentId = userId === room.hostId ? room.guestId : room.hostId;
        if (opponentId) {
          const oppSid = getPlayerSocketId(opponentId);
          if (oppSid) {
            nsp.to(oppSid).emit('opponent_progress', {
              questionIndex,
              status: isCorrect ? 'correct' : 'wrong',
            });
          }
        }

        // 检查是否全部答完
        const myAnswers = (room as any)._answers.get(userId) || [];
        if (myAnswers.length >= room.totalQuestions) {
          socket.emit('you_finished', { message: '你已完成所有题目，等待对手...' });
          await checkGameEnd(room, userId, nsp);
        }
      } catch (err: any) {
        console.error('[Battle] 答题处理失败:', err);
        socket.emit('error_msg', { code: 'SERVER_ERROR', message: '答题处理失败' });
      }
    });

    // ========== 离开房间 ==========
    socket.on('leave_room', () => {
      handleLeaveRoom(socket, nsp);
    });

    // ========== 断线处理 ==========
    socket.on('disconnect', () => {
      console.log(`[Socket] 用户断开 /battle: ${userId} (sid=${socket.id})`);
      handleLeaveRoom(socket, nsp);
      socketUsers.delete(socket.id);
      socketEventLog.delete(socket.id);
      // 仅当该用户无其他活跃连接时才清除映射
      if (userActiveSocket.get(userId) === socket.id) {
        userActiveSocket.delete(userId);
      }
    });
  });
}

// ==================== 游戏逻辑 ====================

/** 开始对战：向双方发送题目（不含答案） */
async function startGame(room: BattleRoom, nsp: SocketIO.Namespace) {
  const [hostInfo, guestInfo] = await Promise.all([
    getUserInfo(room.hostId),
    getUserInfo(room.guestId!),
  ]);

  const questionsForClient = room.questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    difficulty: q.difficulty,
  }));

  const baseData = {
    gameTime: GAME_CONFIG.TIME_PER_QUESTION,
    totalQuestions: room.totalQuestions,
    questions: questionsForClient,
  };

  // 发给房主
  const hostSid = getPlayerSocketId(room.hostId);
  if (hostSid) {
    nsp.to(hostSid).emit('start', {
      ...baseData,
      opponent: { userId: room.guestId, nickname: guestInfo.nickname, avatar: guestInfo.avatar },
    });
  }

  // 发给加入者
  const guestSid = getPlayerSocketId(room.guestId!);
  if (guestSid) {
    nsp.to(guestSid).emit('start', {
      ...baseData,
      opponent: { userId: room.hostId, nickname: hostInfo.nickname, avatar: hostInfo.avatar },
    });
  }

  console.log(`[Game] 房间 ${room.roomCode} 对战开始 ${room.totalQuestions}题`);
}

/** 检查游戏是否结束 */
async function checkGameEnd(room: BattleRoom, finishedUserId: string, nsp: SocketIO.Namespace) {
  const answers = (room as any)._answers as Map<string, BattleAnswer[]>;
  const hostAnswers = answers?.get(room.hostId) || [];
  const guestAnswers = answers?.get(room.guestId!) || [];

  const hostFinished = hostAnswers.length >= room.totalQuestions;
  const guestFinished = guestAnswers.length >= room.totalQuestions;

  // 通知对手：有人答完了
  const opponentId = finishedUserId === room.hostId ? room.guestId : room.hostId;
  if (opponentId && !(opponentId === room.hostId ? hostFinished : guestFinished)) {
    const oppSid = getPlayerSocketId(opponentId);
    if (oppSid) {
      nsp.to(oppSid).emit('opponent_finished', { message: '对手已完成所有题目' });
    }
  }

  // 双方都完成 → 结算
  if (hostFinished && guestFinished) {
    room.status = 'finished';
    await finishGame(room, hostAnswers, guestAnswers, nsp);
  }
}

/** 游戏结算 */
async function finishGame(
  room: BattleRoom,
  hostAnswers: BattleAnswer[],
  guestAnswers: BattleAnswer[],
  nsp: SocketIO.Namespace,
) {
  const [hostInfo, guestInfo] = await Promise.all([
    getUserInfo(room.hostId),
    getUserInfo(room.guestId!),
  ]);

  const hostScore = hostAnswers.reduce((s, a) => s + a.score, 0);
  const hostCorrect = hostAnswers.filter((a) => a.correct).length;
  const hostMaxCombo = Math.max(0, ...hostAnswers.map((a) => a.combo));

  const guestScore = guestAnswers.reduce((s, a) => s + a.score, 0);
  const guestCorrect = guestAnswers.filter((a) => a.correct).length;
  const guestMaxCombo = Math.max(0, ...guestAnswers.map((a) => a.combo));

  let winner: string | null = null;
  if (hostScore > guestScore) winner = room.hostId;
  else if (guestScore > hostScore) winner = room.guestId;
  else winner = 'draw';

  const questionResults = room.questions.map((q) => ({
    questionId: q.id,
    text: q.text,
    correctId: q.correctId,
    explanation: q.explanation,
  }));

  const resultData = {
    players: [
      {
        userId: room.hostId,
        nickname: hostInfo.nickname,
        avatar: hostInfo.avatar,
        score: hostScore,
        correctCount: hostCorrect,
        maxCombo: hostMaxCombo,
        totalQuestions: room.totalQuestions,
        details: hostAnswers.map((a) => ({
          questionIndex: a.questionIndex,
          correct: a.correct,
          score: a.score,
        })),
      },
      {
        userId: room.guestId,
        nickname: guestInfo.nickname,
        avatar: guestInfo.avatar,
        score: guestScore,
        correctCount: guestCorrect,
        maxCombo: guestMaxCombo,
        totalQuestions: room.totalQuestions,
        details: guestAnswers.map((a) => ({
          questionIndex: a.questionIndex,
          correct: a.correct,
          score: a.score,
        })),
      },
    ],
    winner,
    questionResults,
  };

  nsp.to(room.roomCode).emit('game_result', resultData);

  const resultLabel = winner === 'draw' ? '平局' : winner === room.hostId ? '房主胜' : '加入者胜';
  console.log(`[Game] ${room.roomCode} ${resultLabel} host=${hostScore} guest=${guestScore}`);

  // 延迟清理
  setTimeout(() => {
    if (rooms.has(room.roomCode)) {
      rooms.delete(room.roomCode);
    }
  }, GAME_CONFIG.RESULT_CLEANUP_MS);
}

/** 离开房间处理 */
function handleLeaveRoom(socket: SocketIO.Socket, nsp: SocketIO.Namespace) {
  const roomCode = (socket as any).roomCode;
  const userId = (socket as any).userId;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  socket.leave(roomCode);

  // 通知对方
  const opponentId = userId === room.hostId ? room.guestId : room.hostId;
  if (opponentId) {
    const oppSid = getPlayerSocketId(opponentId);
    if (oppSid) {
      nsp.to(oppSid).emit('opponent_left', { message: '对手已离开' });

      if (room.status === 'playing') {
        nsp.to(oppSid).emit('game_result', {
          players: [{
            userId: opponentId, nickname: '', avatar: '',
            score: 0, correctCount: 0, maxCombo: 0,
            totalQuestions: room.totalQuestions,
          }],
          winner: opponentId,
          questionResults: [],
        });
      }
    }
  }

  room.status = 'cancelled';
  rooms.delete(roomCode);
  console.log(`[Room] 房间 ${roomCode} 已关闭（用户离开）`);
}
