// 对战中心 — 创建房间 / 加入房间 / 实时对战 / 结果结算
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGame } from '../../store/gameContext';
import { battleSocket, QuestionData, StartGameData, GameResultData, AnswerResultData, OpponentProgressData, OpponentInfo } from '../../services/socket';
import { SUBJECT_CONFIG } from '../../utils/constants';
import './index.scss';

type BattleView = 'center' | 'waiting' | 'join' | 'playing' | 'result';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};

const COMBO_LEVELS: Record<number, { label: string; emoji: string }> = {
  2: { label: '连击', emoji: '🔥' },
  3: { label: '暴走', emoji: '⚡' },
  5: { label: '超神', emoji: '🌟' },
  10: { label: '神一般', emoji: '👑' },
};

function getComboInfo(combo: number) {
  if (combo >= 10) return COMBO_LEVELS[10];
  if (combo >= 5) return COMBO_LEVELS[5];
  if (combo >= 3) return COMBO_LEVELS[3];
  if (combo >= 2) return COMBO_LEVELS[2];
  return null;
}

const Challenge: React.FC = () => {
  const { state, doLogin } = useGame();
  const { user } = state;

  const [view, setView] = useState<BattleView>('center');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [toast, setToast] = useState('');
  const [navHeight, setNavHeight] = useState(44);
  const [connecting, setConnecting] = useState(false);

  // 游戏状态
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [myAnswers, setMyAnswers] = useState<AnswerResultData[]>([]);
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [opponentProgress, setOpponentProgress] = useState<Set<number>>(new Set());
  const [gameResult, setGameResult] = useState<GameResultData | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [comboPopup, setComboPopup] = useState<{ combo: number } | null>(null);
  const [subject, setSubject] = useState('math');
  const [difficulty, setDifficulty] = useState('normal');
  const inputRef = useRef<any>(null);

  useEffect(() => {
    const info = Taro.getSystemInfoSync();
    setNavHeight((info.statusBarHeight || 0) + 44);
    return () => { battleSocket.disconnect(); };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  // ====== WebSocket 回调 ======
  const handleRoomCreated = useCallback((data: any) => {
    setRoomCode(data.roomCode);
    setSubject(data.subject);
    setDifficulty(data.difficulty);
    setView('waiting');
  }, []);

  const handleOpponentJoined = useCallback((data: { opponent: OpponentInfo }) => {
    setOpponent(data.opponent);
    showToast(`${data.opponent.nickname} 加入了房间`);
  }, []);

  const handleStart = useCallback((data: StartGameData) => {
    setQuestions(data.questions);
    setOpponent(data.opponent);
    setCurrentIndex(0);
    setMyAnswers([]);
    setOpponentProgress(new Set());
    setSelectedOption(null);
    setGameResult(null);
    setQuestionStartTime(Date.now());
    setView('playing');
  }, []);

  const handleAnswerResult = useCallback((data: AnswerResultData) => {
    setMyAnswers((prev) => [...prev, data]);
    if (data.combo >= 2) {
      setComboPopup({ combo: data.combo });
      setTimeout(() => setComboPopup(null), 1500);
    }
    // 下一题
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setQuestionStartTime(Date.now());
    }, 800);
  }, []);

  const handleOpponentProgress = useCallback((data: OpponentProgressData) => {
    setOpponentProgress((prev) => new Set(prev).add(data.questionIndex));
  }, []);

  const handleGameResult = useCallback((data: GameResultData) => {
    setGameResult(data);
    setView('result');
  }, []);

  const handleError = useCallback((data: { message: string }) => {
    showToast(data.message);
  }, []);

  // ====== 创建房间 ======
  const handleCreateRoom = async () => {
    if (!state.user) {
      await doLogin();
      // doLogin 后 state.user 已更新，但解构的 user 不会变，需等待一个 tick
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!state.user) {
      showToast('请先登录');
      return;
    }
    setConnecting(true);
    try {
      await battleSocket.connect({
        onRoomCreated: handleRoomCreated,
        onOpponentJoined: handleOpponentJoined,
        onStart: handleStart,
        onAnswerResult: handleAnswerResult,
        onOpponentProgress: handleOpponentProgress,
        onGameResult: handleGameResult,
        onError: handleError,
        onOpponentLeft: (data) => showToast(data.message),
        onDisconnect: () => showToast('连接已断开'),
      });
      // 使用默认学科和难度（后续可由用户选择）
      battleSocket.createRoom('math', 1, 'normal');
      setSubject('math');
      setDifficulty('normal');
    } catch (err: any) {
      showToast(err.message || '连接失败');
    } finally {
      setConnecting(false);
    }
  };

  // ====== 加入房间 ======
  const handleJoinRoom = () => {
    setJoinCode('');
    setView('join');
  };

  const handleJoinCodeChange = (e: any) => {
    const val = e.detail.value?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || '';
    setJoinCode(val);
  };

  const handleJoinSubmit = async () => {
    if (joinCode.length !== 4) {
      showToast('请输入4位房间码');
      return;
    }
    if (!state.user) {
      showToast('请先登录');
      return;
    }
    setConnecting(true);
    try {
      await battleSocket.connect({
        onRoomJoined: (data) => {
          setRoomCode(data.roomCode);
          setSubject(data.subject);
          setDifficulty(data.difficulty);
          if (data.opponent) setOpponent(data.opponent);
        },
        onOpponentJoined: handleOpponentJoined,
        onStart: handleStart,
        onAnswerResult: handleAnswerResult,
        onOpponentProgress: handleOpponentProgress,
        onGameResult: handleGameResult,
        onError: handleError,
        onOpponentLeft: (data) => showToast(data.message),
        onDisconnect: () => showToast('连接已断开'),
      });
      battleSocket.joinRoom(joinCode);
      setView('waiting');
    } catch (err: any) {
      showToast(err.message || '连接失败');
    } finally {
      setConnecting(false);
    }
  };

  // ====== 提交答案 ======
  const handleSelectOption = (optionId: string) => {
    if (selectedOption || !questions[currentIndex]) return;
    setSelectedOption(optionId);
    const timeSpent = (Date.now() - questionStartTime) / 1000;
    battleSocket.submitAnswer(questions[currentIndex].id, optionId, timeSpent, currentIndex);
  };

  // ====== 离开 ======
  const handleLeaveRoom = () => {
    battleSocket.leaveRoom();
    battleSocket.disconnect();
    setView('center');
    setOpponent(null);
    setQuestions([]);
    setGameResult(null);
    setMyAnswers([]);
  };

  // ====== 回到对战中心 ======
  const handleBackToCenter = () => {
    battleSocket.disconnect();
    setView('center');
    setOpponent(null);
    setQuestions([]);
    setGameResult(null);
    setMyAnswers([]);
    setOpponentProgress(new Set());
  };

  const handleBack = () => {
    if (view === 'center') {
      Taro.switchTab({ url: '/pages/index/index' });
    } else if (view === 'playing') {
      showToast('对战中无法退出');
    } else if (view === 'result') {
      handleBackToCenter();
    } else {
      handleLeaveRoom();
    }
  };

  const titleText =
    view === 'center' ? '对战中心' :
    view === 'waiting' ? '等待对手' :
    view === 'join' ? '加入房间' :
    view === 'playing' ? '答题对战' :
    '对战结果';

  const currentQuestion = questions[currentIndex];
  const myCorrectCount = myAnswers.filter((a) => a.correct).length;
  const myScore = myAnswers.reduce((sum, a) => sum + a.score, 0);

  return (
    <View className='challenge-page'>
      {/* 自定义导航栏 */}
      <View className='challenge-page__nav' style={{ paddingTop: (navHeight - 44) + 'px', height: navHeight + 'px' }}>
        <View className='challenge-page__nav-back' onClick={handleBack}>
          <Text className='challenge-page__nav-back-icon'>←</Text>
        </View>
        <Text className='challenge-page__nav-title'>{titleText}</Text>
      </View>

      <View className='challenge-page__content'>
        {/* ====== 对战中心 ====== */}
        {view === 'center' && (
          <View className='challenge-page__center'>
            <View className='challenge-page__center-icon-wrap'>
              <View className='challenge-page__center-icon'>
                <Text className='challenge-page__center-icon-text'>⚔️</Text>
              </View>
            </View>
            <Text className='challenge-page__center-title'>实时对战</Text>
            <Text className='challenge-page__center-subtitle'>邀请好友同台竞技，看谁答得又快又准</Text>

            <View
              className={`challenge-page__btn challenge-page__btn--primary ${connecting ? 'challenge-page__btn--disabled' : ''}`}
              onClick={handleCreateRoom}
            >
              <Text className='challenge-page__btn-icon'>⚔️</Text>
              <Text className='challenge-page__btn-text'>{connecting ? '连接中...' : '创建房间'}</Text>
            </View>

            <View className='challenge-page__btn challenge-page__btn--outline' onClick={handleJoinRoom}>
              <Text className='challenge-page__btn-icon'>👥</Text>
              <Text className='challenge-page__btn-text'>加入房间</Text>
            </View>
          </View>
        )}

        {/* ====== 等待对手 ====== */}
        {view === 'waiting' && (
          <View className='challenge-page__waiting'>
            <View className='challenge-page__room-card'>
              <Text className='challenge-page__room-label'>房间码</Text>
              <View className='challenge-page__room-code-row'>
                <Text className='challenge-page__room-code'>{roomCode}</Text>
                <View className='challenge-page__copy-btn' onClick={() => {
                  Taro.setClipboardData({ data: roomCode, success: () => showToast('房间码已复制') });
                }}>
                  <Text className='challenge-page__copy-icon'>📋</Text>
                </View>
              </View>
              <View className='challenge-page__room-meta'>
                <Text className='challenge-page__room-meta-item'>{SUBJECT_CONFIG[subject]?.label || subject}</Text>
                <Text className='challenge-page__room-meta-item'>{DIFFICULTY_LABEL[difficulty]}</Text>
              </View>
            </View>

            <View className='challenge-page__vs'>
              <View className='challenge-page__player'>
                <View className='challenge-page__player-avatar challenge-page__player-avatar--host'>
                  <Text className='challenge-page__player-avatar-text'>
                    {user?.nickname?.charAt(0) || '?'}
                  </Text>
                  <View className='challenge-page__player-badge'>
                    <Text className='challenge-page__player-badge-text'>我</Text>
                  </View>
                </View>
                <Text className='challenge-page__player-name'>你</Text>
              </View>

              <View className='challenge-page__vs-indicator'>
                <View className='challenge-page__vs-dot' />
                <Text className='challenge-page__vs-text'>VS</Text>
                <View className='challenge-page__vs-dot' />
              </View>

              <View className='challenge-page__player'>
                {opponent ? (
                  <>
                    <View className='challenge-page__player-avatar challenge-page__player-avatar--opponent'>
                      <Text className='challenge-page__player-avatar-text'>
                        {opponent.nickname?.charAt(0) || '?'}
                      </Text>
                    </View>
                    <Text className='challenge-page__player-name'>{opponent.nickname}</Text>
                  </>
                ) : (
                  <>
                    <View className='challenge-page__player-avatar challenge-page__player-avatar--empty'>
                      <Text className='challenge-page__player-avatar-text'>?</Text>
                    </View>
                    <Text className='challenge-page__player-name'>等待中...</Text>
                  </>
                )}
              </View>
            </View>

            <Text className='challenge-page__waiting-tip'>分享房间码，等待对手加入</Text>
          </View>
        )}

        {/* ====== 加入房间 ====== */}
        {view === 'join' && (
          <View className='challenge-page__join'>
            <View className='challenge-page__join-icon-wrap'>
              <View className='challenge-page__join-icon'>
                <Text className='challenge-page__join-icon-text'>📶</Text>
              </View>
            </View>
            <Text className='challenge-page__join-title'>输入房间码</Text>
            <Text className='challenge-page__join-subtitle'>请输入好友分享的4位房间码</Text>

            <View className='challenge-page__code-input' onClick={() => inputRef.current?.focus?.()}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View
                  key={i}
                  className={`challenge-page__code-cell ${i === joinCode.length ? 'challenge-page__code-cell--focus' : ''}`}
                >
                  <Text className='challenge-page__code-char'>{joinCode[i] || ''}</Text>
                </View>
              ))}
              <Input
                ref={inputRef}
                className='challenge-page__code-hidden'
                type='text'
                maxlength={4}
                value={joinCode}
                onInput={handleJoinCodeChange}
                focus={view === 'join'}
              />
            </View>

            <View
              className={`challenge-page__btn challenge-page__btn--primary ${joinCode.length !== 4 || connecting ? 'challenge-page__btn--disabled' : ''}`}
              onClick={handleJoinSubmit}
            >
              <Text className='challenge-page__btn-text'>{connecting ? '连接中...' : '加入对战'}</Text>
            </View>
          </View>
        )}

        {/* ====== 实时对战 ====== */}
        {view === 'playing' && currentQuestion && (
          <View className='challenge-page__battle'>
            {/* 对战进度条 */}
            <View className='challenge-page__battle-header'>
              <View className='challenge-page__battle-player'>
                <View className='challenge-page__battle-avatar challenge-page__battle-avatar--me'>
                  <Text>{user?.nickname?.charAt(0) || '?'}</Text>
                </View>
                <Text className='challenge-page__battle-name'>我</Text>
                <Text className='challenge-page__battle-score'>{myScore}</Text>
              </View>
              <View className='challenge-page__battle-progress'>
                <Text className='challenge-page__battle-progress-text'>{currentIndex + 1}/{questions.length}</Text>
              </View>
              <View className='challenge-page__battle-player'>
                <View className='challenge-page__battle-avatar challenge-page__battle-avatar--opp'>
                  <Text>{opponent?.nickname?.charAt(0) || '?'}</Text>
                </View>
                <Text className='challenge-page__battle-name'>{opponent?.nickname || '对手'}</Text>
                <Text className='challenge-page__battle-score'>?</Text>
              </View>
            </View>

            {/* 对手答题进度指示器 */}
            <View className='challenge-page__opp-progress'>
              {questions.map((_, i) => (
                <View
                  key={i}
                  className={`challenge-page__opp-dot ${opponentProgress.has(i) ? 'challenge-page__opp-dot--done' : ''} ${i === currentIndex ? 'challenge-page__opp-dot--current' : ''}`}
                />
              ))}
            </View>

            {/* 题目卡片 */}
            <View className={`challenge-page__question-card ${selectedOption ? 'challenge-page__question-card--answered' : ''}`}>
              <View className='challenge-page__question-num'>
                <Text>第 {currentIndex + 1} 题</Text>
              </View>
              <Text className='challenge-page__question-text'>{currentQuestion.text}</Text>

              <View className='challenge-page__options'>
                {currentQuestion.options.map((opt) => {
                  let cls = 'challenge-page__option';
                  if (selectedOption === opt.id) {
                    cls += ' challenge-page__option--selected';
                    const last = myAnswers[myAnswers.length - 1];
                    if (last) {
                      cls += last.correct ? ' challenge-page__option--correct' : ' challenge-page__option--wrong';
                    }
                  }
                  return (
                    <View key={opt.id} className={cls} onClick={() => handleSelectOption(opt.id)}>
                      <View className='challenge-page__option-badge'>
                        <Text>{opt.id}</Text>
                      </View>
                      <Text className='challenge-page__option-text'>{opt.text}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 答题反馈 */}
            {selectedOption && myAnswers.length > 0 && (
              <View className='challenge-page__feedback'>
                <Text className='challenge-page__feedback-icon'>
                  {myAnswers[myAnswers.length - 1].correct ? '✅' : '❌'}
                </Text>
                <Text className='challenge-page__feedback-text'>
                  {myAnswers[myAnswers.length - 1].correct
                    ? `+${myAnswers[myAnswers.length - 1].score} 分`
                    : '答错了'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ====== 对战结果 ====== */}
        {view === 'result' && gameResult && (
          <View className='challenge-page__result'>
            {/* 结果标题 */}
            <View className='challenge-page__result-header'>
              <Text className='challenge-page__result-title'>
                {gameResult.winner === 'draw'
                  ? '🤝 平局！'
                  : gameResult.winner === user?._id
                    ? '🎉 你赢了！'
                    : '😔 你输了'}
              </Text>
            </View>

            {/* 双方分数对比 */}
            <View className='challenge-page__result-vs'>
              {gameResult.players.map((player, i) => {
                const isMe = player.userId === user?._id;
                const isWinner = gameResult.winner === player.userId;
                return (
                  <View key={i} className={`challenge-page__result-player ${isWinner ? 'challenge-page__result-player--winner' : ''}`}>
                    <View className={`challenge-page__result-avatar ${isMe ? 'challenge-page__result-avatar--me' : ''}`}>
                      <Text>{player.nickname?.charAt(0) || '?'}</Text>
                    </View>
                    <Text className='challenge-page__result-nickname'>{player.nickname}</Text>
                    <Text className='challenge-page__result-score'>{player.score}</Text>
                    <Text className='challenge-page__result-label'>分</Text>
                    <Text className='challenge-page__result-detail'>
                      {player.correctCount}/{player.totalQuestions} 正确
                    </Text>
                  </View>
                );
              })}
            </View>

            <View className='challenge-page__btn challenge-page__btn--primary' onClick={handleBackToCenter}>
              <Text className='challenge-page__btn-text'>返回对战中心</Text>
            </View>
          </View>
        )}
      </View>

      {/* Combo 弹窗 */}
      {comboPopup && (
        <View className='challenge-page__combo-popup'>
          <Text className='challenge-page__combo-emoji'>{getComboInfo(comboPopup.combo)?.emoji || '🔥'}</Text>
          <Text className='challenge-page__combo-text'>{getComboInfo(comboPopup.combo)?.label || ''}</Text>
        </View>
      )}

      {/* Toast */}
      {toast && (
        <View className='challenge-page__toast'>
          <Text className='challenge-page__toast-text'>{toast}</Text>
        </View>
      )}
    </View>
  );
};

export default Challenge;
