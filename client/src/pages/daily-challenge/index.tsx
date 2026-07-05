import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getDailyChallenge, completeDailyChallenge, startGame } from '../../services/api';
import { subjectLabel } from '../../utils/helpers';
import { DIFFICULTY_CONFIG, getComboMultiplier, SCORING_CONFIG, COMBO_POPUP } from '../../utils/constants';
import CountdownRing from '../../components/CountdownRing';
import OptionButton from '../../components/OptionButton';
import ComboPopup from '../../components/ComboPopup';
import LifeHearts from '../../components/LifeHearts';
import './index.scss';

const TOTAL_QUESTIONS = 10;
const MAX_LIVES = 3;
const DIFFICULTY: 'normal' = 'normal';
const MAX_TIME = DIFFICULTY_CONFIG[DIFFICULTY].time;

const subjectGradients: Record<string, { from: string; to: string }> = {
  chinese: { from: '#f97060', to: '#ffb199' },
  math: { from: '#3b9eff', to: '#7ad4ff' },
  english: { from: '#a259ff', to: '#e879f9' },
  science: { from: '#10b981', to: '#6ee7b7' },
  history: { from: '#f59e0b', to: '#fde68a' },
  geography: { from: '#6366f1', to: '#a5b4fc' },
};

interface Question {
  _id: string;
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
}

type PageState = 'loading' | 'completed' | 'unstarted' | 'ready' | 'playing' | 'reveal' | 'finished';

const DailyChallenge: React.FC = () => {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [dailyInfo, setDailyInfo] = useState<{ today: any; streak: number; history: any[] } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ correct: boolean; correctOptionId: string } | null>(null);
  const [countdown, setCountdown] = useState(MAX_TIME);
  const [readyCount, setReadyCount] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [pendingCombo, setPendingCombo] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [lives, setLives] = useState(MAX_LIVES);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const selectedIdRef = useRef(selectedId);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const questionsAnsweredRef = useRef(0);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { questionsAnsweredRef.current = questionsAnswered; }, [questionsAnswered]);

  const subject = dailyInfo?.today?.subject || 'math';
  const gradient = subjectGradients[subject] || subjectGradients.math;

  // 加载每日挑战信息
  useEffect(() => {
    getDailyChallenge()
      .then((data) => {
        setDailyInfo(data);
        if (data.today?.completed) {
          setPageState('completed');
        } else {
          setPageState('unstarted');
        }
      })
      .catch(() => {
        Taro.showToast({ title: '加载失败', icon: 'none' });
        setTimeout(() => Taro.navigateBack(), 1500);
      });
  }, []);

  // 开始挑战
  const handleStart = useCallback(async () => {
    try {
      setPageState('ready');
      const chapter = Math.floor(Math.random() * 5) + 1;
      const result = await startGame(subject, chapter, DIFFICULTY);
      setQuestions(result.questions);
      setReadyCount(3);
    } catch {
      Taro.showToast({ title: '获取题目失败', icon: 'none' });
      setPageState('unstarted');
    }
  }, [subject]);

  // Ready 3-2-1 倒计时
  useEffect(() => {
    if (pageState !== 'ready') return;
    setReadyCount(3);
    const t = setInterval(() => {
      setReadyCount((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          setPageState('playing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pageState]);

  // 答题倒计时
  useEffect(() => {
    if (pageState !== 'playing') return;
    setCountdown(MAX_TIME);
    setSelectedId(null);
    setLastResult(null);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // 超时自动选第一个选项
          const opt = selectedIdRef.current || 'A';
          handleAnswer(opt, MAX_TIME);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [pageState, currentIndex]);

  const currentQ = questions[currentIndex];

  // 答对判定
  const isCorrect = (optionId: string) => {
    return currentQ && optionId === currentQ.correctOptionId;
  };

  // 提交答案
  const handleAnswer = useCallback(
    (optionId: string, timeSpent: number) => {
      if (lastResult) return; // 已揭晓
      clearInterval(timerRef.current!);

      const correct = isCorrect(optionId);
      const newCombo = correct ? combo + 1 : 0;
      setPendingCombo(newCombo);

      let addScore = 0;
      let gameOver = false;
      if (correct) {
        const config = DIFFICULTY_CONFIG[DIFFICULTY];
        const timeBonus = Math.max(0, (config.time - timeSpent) * SCORING_CONFIG.timeBonusPerSecond);
        const multiplier = getComboMultiplier(combo);
        addScore = Math.round((config.baseScore + timeBonus) * multiplier);
        setScore((s) => s + addScore);
        setCombo((c) => c + 1);
      } else {
        setCombo(0);
        const newLives = livesRef.current - 1;
        setLives(newLives);
        if (newLives <= 0) {
          gameOver = true;
        }
      }

      if (newCombo >= COMBO_POPUP.minCombo) {
        setShowCombo(true);
      }

      const newQAnswered = questionsAnsweredRef.current + 1;
      setQuestionsAnswered(newQAnswered);

      setLastResult({ correct, correctOptionId: currentQ.correctOptionId });
      setPageState('reveal');

      // 自动进入下一题或结束
      setTimeout(() => {
        if (gameOver || currentIndex >= TOTAL_QUESTIONS - 1) {
          handleFinish(newQAnswered);
        } else {
          setCurrentIndex((i) => i + 1);
          setPageState('playing');
        }
      }, correct ? 1800 : 2200);
    },
    [combo, currentIndex, currentQ, lastResult],
  );

  const handleSelect = (optionId: string) => {
    if (pageState !== 'playing' || selectedId || lastResult) return;
    setSelectedId(optionId);
    selectedIdRef.current = optionId;
    handleAnswer(optionId, MAX_TIME - countdown);
  };

  // 结束挑战
  const handleFinish = useCallback(async (answered: number) => {
    setSubmitting(true);
    try {
      const finalScore = scoreRef.current;
      const result = await completeDailyChallenge(finalScore, answered);
      setFinalResult(result);
      setPageState('finished');
    } catch {
      Taro.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleBack = () => {
    Taro.navigateBack().catch(() => Taro.switchTab({ url: '/pages/index/index' }));
  };

  // ====== LOADING ======
  if (pageState === 'loading') {
    return (
      <View className='daily-page daily-page--center'>
        <Text className='daily-page__loading-text'>加载中...</Text>
      </View>
    );
  }

  // ====== COMPLETED：今日已完成 ======
  if (pageState === 'completed') {
    const today = dailyInfo?.today;
    return (
      <View className='daily-page daily-page--center'>
        <View className='daily-page__completed-card'>
          <Text className='daily-page__completed-icon'>✅</Text>
          <Text className='daily-page__completed-title'>今日挑战已完成</Text>
          <View className='daily-page__completed-stats'>
            <View className='daily-page__stat-item'>
              <Text className='daily-page__stat-value'>{today?.score || 0}</Text>
              <Text className='daily-page__stat-label'>得分</Text>
            </View>
            <View className='daily-page__stat-divider' />
            <View className='daily-page__stat-item'>
              <Text className='daily-page__stat-value'>{today?.questionsAnswered || 0}</Text>
              <Text className='daily-page__stat-label'>答题</Text>
            </View>
            <View className='daily-page__stat-divider' />
            <View className='daily-page__stat-item'>
              <Text className='daily-page__stat-value'>{dailyInfo?.streak || 0}天</Text>
              <Text className='daily-page__stat-label'>连续签到</Text>
            </View>
          </View>
          <View
            className='daily-page__back-btn'
            onClick={handleBack}
          >
            <Text>返回</Text>
          </View>
        </View>
      </View>
    );
  }

  // ====== UNSTARTED：未开始 ======
  if (pageState === 'unstarted') {
    return (
      <View className='daily-page daily-page--center'>
        <View className='daily-page__card'>
          <Text className='daily-page__card-badge'>每日挑战</Text>
          <Text className='daily-page__card-date'>
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
          </Text>
          <View
            className='daily-page__subject-tag'
            style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
          >
            <Text>{subjectLabel(subject)}</Text>
          </View>
          <Text className='daily-page__card-desc'>
            今日随机学科挑战，10 道题，答对得分，答错扣一条命，用完3条命游戏结束！
          </Text>
          <View className='daily-page__card-info'>
            <View className='daily-page__info-item'>
              <Text className='daily-page__info-icon'>📝</Text>
              <Text className='daily-page__info-text'>10 道题目</Text>
            </View>
            <View className='daily-page__info-item'>
              <Text className='daily-page__info-icon'>⏱️</Text>
              <Text className='daily-page__info-text'>每题 {MAX_TIME} 秒</Text>
            </View>
            <View className='daily-page__info-item'>
              <Text className='daily-page__info-icon'>❤️</Text>
              <Text className='daily-page__info-text'>3 条命</Text>
            </View>
            <View className='daily-page__info-item'>
              <Text className='daily-page__info-icon'>🔥</Text>
              <Text className='daily-page__info-text'>连击加成</Text>
            </View>
          </View>
          <View className='daily-page__start-btn' onClick={handleStart}>
            <Text className='daily-page__start-text'>开始挑战</Text>
          </View>
          {dailyInfo?.streak > 0 && (
            <Text className='daily-page__streak-hint'>
              已连续签到 {dailyInfo.streak} 天，继续加油！
            </Text>
          )}
        </View>
      </View>
    );
  }

  // ====== READY：准备倒计时 ======
  if (pageState === 'ready') {
    return (
      <View className='daily-page daily-page--center'>
        <View className='daily-page__ready-watermark'>DAILY</View>
        <View className='daily-page__ready-back' onClick={handleBack}>
          <Text className='daily-page__ready-back-text'>← 返回</Text>
        </View>
        <Text className='daily-page__ready-label'>每日挑战 · 请准备</Text>
        <View className='daily-page__ready-count' key={readyCount}>
          {readyCount === 0 ? 'GO!' : readyCount}
        </View>
        <View className='daily-page__ready-footer'>
          <Text className='daily-page__ready-footer-text'>
            {subjectLabel(subject)} · {DIFFICULTY_CONFIG[DIFFICULTY].label} · 共 {TOTAL_QUESTIONS} 题
          </Text>
        </View>
      </View>
    );
  }

  // ====== FINISHED：提交完成 ======
  if (pageState === 'finished') {
    return (
      <View className='daily-page daily-page--center'>
        <View className='daily-page__completed-card'>
          <Text className='daily-page__completed-icon'>🎉</Text>
          <Text className='daily-page__completed-title'>挑战完成！</Text>
          <View className='daily-page__completed-stats'>
            <View className='daily-page__stat-item'>
              <Text className='daily-page__stat-value'>{score}</Text>
              <Text className='daily-page__stat-label'>得分</Text>
            </View>
            <View className='daily-page__stat-divider' />
            <View className='daily-page__stat-item'>
              <Text className='daily-page__stat-value'>{questionsAnswered}</Text>
              <Text className='daily-page__stat-label'>答题</Text>
            </View>
            <View className='daily-page__stat-divider' />
            <View className='daily-page__stat-item'>
              <Text className='daily-page__stat-value'>{finalResult?.streak || dailyInfo?.streak || 0}天</Text>
              <Text className='daily-page__stat-label'>连续签到</Text>
            </View>
          </View>
          <View className='daily-page__back-btn' onClick={handleBack}>
            <Text>返回</Text>
          </View>
        </View>
      </View>
    );
  }

  if (!currentQ) {
    return (
      <View className='daily-page daily-page--center'>
        <Text className='daily-page__loading-text'>加载题目中...</Text>
      </View>
    );
  }

  // ====== PLAYING / REVEAL ======
  const isRevealed = lastResult !== null && pageState === 'reveal';
  const optionState = (id: string): 'default' | 'selected' | 'correct' | 'wrong' => {
    if (!isRevealed) return selectedId === id ? 'selected' : 'default';
    if (id === lastResult!.correctOptionId) return 'correct';
    if (id === selectedId && !lastResult!.correct) return 'wrong';
    return 'disabled';
  };

  return (
    <View className='daily-page daily-page--quiz'>
      {/* Combo 弹窗 */}
      <ComboPopup combo={pendingCombo} visible={showCombo} onDone={() => setShowCombo(false)} />

      {/* 背景装饰 */}
      <View className='daily-page__bg-dot daily-page__bg-dot--1' />
      <View className='daily-page__bg-dot daily-page__bg-dot--2' />

      {/* 顶部栏 */}
      <View className='daily-page__header'>
        <View className='daily-page__back' onClick={handleBack}>
          <Text className='daily-page__back-arrow'>←</Text>
        </View>
        <View
          className='daily-page__badge'
          style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})` }}
        >
          <Text>{subjectLabel(subject)} · 第 {currentIndex + 1}/{TOTAL_QUESTIONS} 题</Text>
        </View>
        <View className='daily-page__header-right' />
      </View>

      {/* 得分 */}
      <View className='daily-page__score-bar'>
        <Text className='daily-page__score-text'>{score} 分</Text>
        {combo >= 2 && (
          <View className='daily-page__combo-tag'>
            <Text className='daily-page__combo-text'>{combo}× COMBO</Text>
          </View>
        )}
      </View>

      {/* 生命值 */}
      <View className='daily-page__lives-bar'>
        <LifeHearts lives={lives} maxLives={MAX_LIVES} />
      </View>

      {/* 倒计时环 */}
      <View className='daily-page__timer'>
        <CountdownRing
          total={DIFFICULTY_CONFIG[DIFFICULTY].time}
          remaining={countdown}
          size={72}
          accentColor={gradient.from}
        />
      </View>

      {/* 白色答题卡 */}
      <View className='daily-page__quiz-card'>
        <View className='daily-page__quiz-spacer' />

        {/* 揭晓横幅 */}
        {isRevealed && (
          <View className={`daily-page__reveal daily-page__reveal--${lastResult!.correct ? 'correct' : 'wrong'}`}>
            <Text className='daily-page__reveal-emoji'>{lastResult!.correct ? '😄' : '😟'}</Text>
            <Text className='daily-page__reveal-text'>
              {lastResult!.correct ? '回答正确' : '回答错误'}
            </Text>
          </View>
        )}

        {/* 题目标签 */}
        <View className='daily-page__q-label'>
          <Text className='daily-page__q-label-icon'>🏅</Text>
          <Text className='daily-page__q-label-text'>
            {currentIndex === TOTAL_QUESTIONS - 1 ? '最后一题' : `第 ${currentIndex + 1} 题`}
          </Text>
          <Text className='daily-page__q-label-icon'>🏅</Text>
        </View>

        {/* 题目文本 */}
        <View className='daily-page__question'>{currentQ.text}</View>

        {/* 选项 */}
        <View className='daily-page__options'>
          {currentQ.options.map((opt) => (
            <OptionButton
              key={opt.id}
              id={opt.id}
              text={opt.text}
              state={optionState(opt.id)}
              disabled={isRevealed}
              onClick={handleSelect}
              correctGradient={`linear-gradient(135deg, ${gradient.from}, ${gradient.to})`}
            />
          ))}
        </View>

        {/* 底部提示 */}
        <View className='daily-page__hint'>
          {!isRevealed && (
            <Text>请在倒计时结束前作答</Text>
          )}
          {isRevealed && lastResult!.correct && (
            <View className='daily-page__hint-row'>
              <Text className='daily-page__hint-correct'>回答正确 {combo >= 2 ? `· ${combo}连击！` : ''}</Text>
            </View>
          )}
          {isRevealed && !lastResult!.correct && (
            <View className='daily-page__hint-row'>
              <Text className='daily-page__hint-wrong'>回答错误，继续加油</Text>
            </View>
          )}
        </View>
      </View>

      {/* 提交中遮罩 */}
      {submitting && (
        <View className='daily-page__overlay'>
          <Text className='daily-page__overlay-text'>提交中...</Text>
        </View>
      )}
    </View>
  );
};

export default DailyChallenge;
