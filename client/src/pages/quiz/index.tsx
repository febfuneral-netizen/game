import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGame } from '../../store/gameContext';
import { subjectLabel } from '../../utils/helpers';
import { COUNTDOWN_SECONDS, TOTAL_QUESTIONS, DIFFICULTY_CONFIG, getComboMultiplier, SCORING_CONFIG, COMBO_POPUP } from '../../utils/constants';
import CountdownRing from '../../components/CountdownRing';
import OptionButton from '../../components/OptionButton';
import LifeHearts from '../../components/LifeHearts';
import ComboPopup from '../../components/ComboPopup';
import './index.scss';

const subjectColors: Record<string, { from: string; to: string; shadow: string }> = {
  chinese:   { from: '#f97060', to: '#ffb199', shadow: 'rgba(249,112,96,0.5)' },
  math:      { from: '#3b9eff', to: '#7ad4ff', shadow: 'rgba(59,158,255,0.5)' },
  english:   { from: '#a259ff', to: '#e879f9', shadow: 'rgba(162,89,255,0.5)' },
  science:   { from: '#10b981', to: '#6ee7b7', shadow: 'rgba(16,185,129,0.5)' },
  history:   { from: '#f59e0b', to: '#fde68a', shadow: 'rgba(245,158,11,0.5)' },
  geography: { from: '#6366f1', to: '#a5b4fc', shadow: 'rgba(99,102,241,0.5)' },
};

/** 计算本题得分 */
function calcQuestionScore(correct: boolean, difficulty: keyof typeof DIFFICULTY_CONFIG, timeSpent: number, combo: number): number {
  if (!correct) return 0;
  const config = DIFFICULTY_CONFIG[difficulty];
  const timeBonus = Math.max(0, (config.time - timeSpent) * SCORING_CONFIG.timeBonusPerSecond);
  const multiplier = getComboMultiplier(combo);
  return Math.round((config.baseScore + timeBonus) * multiplier);
}

const Quiz: React.FC = () => {
  const { state, dispatch, doSubmitAnswer } = useGame();
  const {
    status, questions, currentQuestionIndex, selectedOptionId, lastResult,
    currentSubject, difficulty, lives, combo, score,
  } = state;

  const maxTime = DIFFICULTY_CONFIG[difficulty]?.time || COUNTDOWN_SECONDS;
  const [countdown, setCountdown] = useState(maxTime);
  const [readyCount, setReadyCount] = useState(3);
  const [answerHistory, setAnswerHistory] = useState<boolean[]>([]);
  const [showCombo, setShowCombo] = useState(false);
  const [pendingCombo, setPendingCombo] = useState(0);
  const timerRef = useRef<number>();
  const selectedOptionIdRef = useRef(selectedOptionId);
  useEffect(() => { selectedOptionIdRef.current = selectedOptionId; }, [selectedOptionId]);

  const currentQ = questions[currentQuestionIndex];
  const color = subjectColors[currentSubject || 'math'] || subjectColors.math;
  const isReadyStatus = status === 'READY';
  const isRevealed = lastResult !== null;

  const optionState = (id: string): 'default' | 'selected' | 'correct' | 'wrong' => {
    if (!lastResult) return selectedOptionId === id ? 'selected' : 'default';
    if (lastResult.correctOptionId === id) return 'correct';
    if (selectedOptionId === id && !lastResult.correct) return 'wrong';
    return 'disabled';
  };

  // ready 倒计时
  useEffect(() => {
    if (!isReadyStatus) return;
    setReadyCount(3);
    const t = setInterval(() => {
      setReadyCount((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          dispatch({ type: 'SET_STATUS', payload: 'QUESTION' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [status]);

  // 答题倒计时（使用难度时间）
  useEffect(() => {
    if (status !== 'QUESTION') return;
    setCountdown(maxTime);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // 超时自动提交（选第一个选项，算错）
          const opt = selectedOptionIdRef.current || 'A';
          doSubmitAnswer(opt, maxTime);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [status, currentQuestionIndex]);

  // 记录答题历史 + 处理 combo/生命/计分
  useEffect(() => {
    if (status === 'REVEAL' && lastResult) {
      setAnswerHistory((prev) => [...prev, lastResult.correct]);

      const newCombo = lastResult.correct ? combo + 1 : 0;
      setPendingCombo(newCombo);

      if (lastResult.correct) {
        dispatch({ type: 'INCREMENT_COMBO' });
        // 计分：使用 REVEAL 时的 combo（还没自增，所以传 combo）
        const questionScore = calcQuestionScore(true, difficulty, maxTime - countdown, combo);
        dispatch({ type: 'ADD_SCORE', payload: questionScore });
      } else {
        dispatch({ type: 'RESET_COMBO' });
        dispatch({ type: 'LOSE_LIFE' });
      }

      // combo ≥ 2 弹出
      if (newCombo >= COMBO_POPUP.minCombo) {
        setShowCombo(true);
      }
    }
  }, [status, lastResult]);

  // 揭晓后自动进入下一题或结束（含生命为 0 时立即结束）
  useEffect(() => {
    if (status !== 'REVEAL') return;

    // 生命为 0 → 游戏结束
    if (lives <= 0) {
      setTimeout(() => {
        dispatch({ type: 'FINISH_GAME', payload: { ...lastResult, eliminated: true, totalScore: score } });
        Taro.redirectTo({ url: '/pages/result/index' });
      }, 2000);
      return;
    }

    if (lastResult?.isLastQuestion) {
      setTimeout(() => {
        dispatch({ type: 'FINISH_GAME', payload: { ...lastResult, totalScore: score } });
        Taro.redirectTo({ url: '/pages/result/index' });
      }, 2000);
      return;
    }
    const t = setTimeout(() => {
      dispatch({ type: 'NEXT_QUESTION' });
    }, 3000);
    return () => clearTimeout(t);
  }, [status, lastResult]);

  const handleSelect = (optionId: string) => {
    if (status !== 'QUESTION' || selectedOptionId) return;
    selectedOptionIdRef.current = optionId;
    dispatch({ type: 'SELECT_OPTION', payload: optionId });
    doSubmitAnswer(optionId, maxTime - countdown);
  };

  const handleBack = () => {
    dispatch({ type: 'RESET' });
    Taro.reLaunch({ url: '/pages/index/index' });
  };

  // ===== READY 阶段 =====
  if (status === 'READY') {
    if (questions.length === 0) {
      return (
        <View className='quiz-page quiz-page--ready'>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>加载题目中...</Text>
        </View>
      );
    }
    return (
      <View className='quiz-page quiz-page--ready'>
        {/* READY 超大水印 */}
        <View className='quiz-page__ready-watermark'>READY</View>

        {/* 背景模糊装饰圆 */}
        <View className='quiz-page__blur-dot quiz-page__blur-dot--1' />
        <View className='quiz-page__blur-dot quiz-page__blur-dot--2' />

        {/* 返回按钮 */}
        <View className='quiz-page__ready-back' onClick={handleBack}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>← 返回</Text>
        </View>

        {/* "请准备" 文案 */}
        <Text className='quiz-page__ready-label'>请准备</Text>

        {/* 3-2-1 GO! */}
        <View className='quiz-page__ready-count' key={readyCount}>
          {readyCount === 0 ? 'GO!' : readyCount}
        </View>

        {/* 生命值显示 */}
        <View className='quiz-page__ready-lives'>
          <LifeHearts lives={lives} />
        </View>

        {/* 底部信息条 */}
        <View className='quiz-page__ready-footer'>
          <View className='quiz-page__ready-footer-inner'>
            第 {state.currentChapter} 章 · {DIFFICULTY_CONFIG[difficulty].label} · 共 {TOTAL_QUESTIONS} 道
          </View>
        </View>
      </View>
    );
  }

  if (!currentQ) {
    return <View className='quiz-page'><Text style={{ color: '#fff', padding: 40 }}>加载中...</Text></View>;
  }

  // ===== PLAYING / REVEAL 阶段 =====
  const revealType = lastResult
    ? lastResult.correct ? 'correct' : 'wrong'
    : null;

  return (
    <View className='quiz-page'>
      {/* Combo 弹窗 */}
      <ComboPopup combo={pendingCombo} visible={showCombo} onDone={() => setShowCombo(false)} />

      {/* 背景模糊装饰圆 */}
      <View className='quiz-page__blur-dot quiz-page__blur-dot--3' />
      <View className='quiz-page__blur-dot quiz-page__blur-dot--4' />

      {/* 顶部栏 */}
      <View className='quiz-page__header'>
        <View className='quiz-page__back-btn' onClick={handleBack}>
          <Text className='quiz-page__back-icon'>←</Text>
        </View>
        <View
          className='quiz-page__subject-badge'
          style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
        >
          {subjectLabel(currentSubject || '')} · 第 {currentQuestionIndex + 1}/{TOTAL_QUESTIONS} 题
        </View>
        <View className='quiz-page__header-right'>
          <LifeHearts lives={lives} />
        </View>
      </View>

      {/* 得分&Combo 显示 */}
      <View className='quiz-page__score-bar'>
        <Text className='quiz-page__score-text'>{score} 分</Text>
        {combo >= 2 && (
          <View className='quiz-page__combo-badge'>
            <Text className='quiz-page__combo-text'>{combo}× COMBO</Text>
          </View>
        )}
      </View>

      {/* 倒计时环 — 精确复刻 TimerRing */}
      <View className='quiz-page__timer-wrap'>
        <CountdownRing
          total={COUNTDOWN_SECONDS}
          remaining={countdown}
          size={80}
          accentColor={color.from}
        />
      </View>

      {/* 白色主卡片 — 精确复刻 QuizHall.tsx card */}
      <View className='quiz-page__card'>
        <View className='quiz-page__card-top-spacer' />

        {/* 揭晓横幅 — 精确复刻 RevealBanner */}
        {lastResult && (
          <View className={`quiz-page__reveal quiz-page__reveal--${revealType}`}>
            {/* 爆发粒子 */}
            {Array.from({ length: 8 }).map((_, i) => {
              const colors = lastResult.correct
                ? ['#6ee7b7','#a7f3d0','#fff','#d1fae5','#34d399','#fff','#a7f3d0','#6ee7b7']
                : ['#fca5a5','#fff','#fda4af','#fecaca','#f87171','#fff','#fca5a5','#fda4af'];
              // 使用字符串形式的 animationName 以兼容 Taro 内联样式
              const animName = `burstFly${i}`;
              return (
                <View
                  key={i}
                  className='quiz-page__reveal-dot'
                  style={{
                    background: colors[i],
                    animationName: animName,
                    animationDuration: '0.65s',
                    animationTimingFunction: 'ease-out',
                    animationDelay: '0.05s',
                    animationFillMode: 'both',
                  } as any}
                />
              );
            })}
            <Text className='quiz-page__reveal-emoji'>
              {lastResult.correct ? '😄' : '😟'}
            </Text>
            <Text className='quiz-page__reveal-text'>
              {lastResult.correct ? '恭喜你选择正确' : '很遗憾选择错误'}
            </Text>
          </View>
        )}

        {/* 题目标签 */}
        <View className='quiz-page__q-label'>
          <Text className='quiz-page__q-label-icon'>🏅</Text>
          <Text className='quiz-page__q-label-text'>
            {currentQuestionIndex === TOTAL_QUESTIONS - 1 ? '终极一问' : `第 ${currentQuestionIndex + 1} 题`}
          </Text>
          <Text className='quiz-page__q-label-icon'>🏅</Text>
        </View>

        {/* 题目文本 */}
        <View className='quiz-page__question'>
          {currentQ.text}
        </View>

        {/* 选项列表 */}
        <View className='quiz-page__options'>
          {currentQ.options.map((opt: any) => (
            <OptionButton
              key={opt.id}
              id={opt.id}
              text={opt.text}
              state={optionState(opt.id)}
              disabled={isRevealed}
              onClick={handleSelect}
              correctGradient={`linear-gradient(135deg, ${color.from}, ${color.to})`}
            />
          ))}
        </View>

        {/* 底部提示 */}
        <View className='quiz-page__hint'>
          {!isRevealed && (
            <Text>请在倒计时结束前作答 {difficulty !== 'normal' && `· ${DIFFICULTY_CONFIG[difficulty].label}`}</Text>
          )}
          {isRevealed && lastResult.correct && (
            <View className='quiz-page__hint-row'>
              <Text className='quiz-page__hint-correct'>选择正确 +{lastResult.score}分</Text>
              {combo >= 2 && <Text className='quiz-page__hint-combo'>{combo}× Combo!</Text>}
            </View>
          )}
          {isRevealed && !lastResult.correct && (
            <View className='quiz-page__hint-row'>
              <Text className='quiz-page__hint-wrong'>回答错误，生命 -1</Text>
              <LifeHearts lives={lives} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default Quiz;
