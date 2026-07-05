// 学科准备页 — 难度选择 / 章节进度 / 生命说明 / 开始按钮
import React, { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGame } from '../../store/gameContext';
import { SUBJECT_CONFIG, DIFFICULTY_CONFIG, MAX_CHAPTER, CHAPTER_QUESTIONS, MAX_LIVES } from '../../utils/constants';
import { subjectLabel } from '../../utils/helpers';
import './index.scss';

const subjectGradients: Record<string, { gradient: string; shadow: string }> = {
  chinese:   { gradient: 'linear-gradient(135deg, #f97060, #ffb199)', shadow: 'rgba(249,112,96,0.4)' },
  math:      { gradient: 'linear-gradient(135deg, #3b9eff, #7ad4ff)', shadow: 'rgba(59,158,255,0.4)' },
  english:   { gradient: 'linear-gradient(135deg, #a259ff, #e879f9)', shadow: 'rgba(162,89,255,0.4)' },
  science:   { gradient: 'linear-gradient(135deg, #10b981, #6ee7b7)', shadow: 'rgba(16,185,129,0.4)' },
  history:   { gradient: 'linear-gradient(135deg, #f59e0b, #fde68a)', shadow: 'rgba(245,158,11,0.4)' },
  geography: { gradient: 'linear-gradient(135deg, #6366f1, #a5b4fc)', shadow: 'rgba(99,102,241,0.4)' },
};

const SubjectPrep: React.FC = () => {
  const { state, dispatch, doStartGame } = useGame();
  const { currentSubject, user } = state;

  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTY_CONFIG>('normal');
  const [chapter, setChapter] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // 如果直接访问此页但没有选学科，返回首页
  useEffect(() => {
    if (!currentSubject) {
      Taro.reLaunch({ url: '/pages/index/index' });
    }
  }, [currentSubject]);

  if (!currentSubject) return null;

  const subjectConf = SUBJECT_CONFIG[currentSubject] || SUBJECT_CONFIG.math;
  const grad = subjectGradients[currentSubject] || subjectGradients.math;
  const diffConf = DIFFICULTY_CONFIG[difficulty];

  // 用户在该学科的进度
  const subjectProgress = user?.subjects?.[currentSubject];
  const bestScore = subjectProgress?.bestScore || 0;
  const currentCh = subjectProgress?.currentChapter || 1;

  const handleStart = () => {
    dispatch({ type: 'SET_CHAPTER', payload: chapter });
    doStartGame(currentSubject, chapter, difficulty);
  };

  const handleBack = () => {
    dispatch({ type: 'RESET' });
    Taro.navigateBack();
  };

  // 难度选项
  const diffEntries = Object.entries(DIFFICULTY_CONFIG) as [keyof typeof DIFFICULTY_CONFIG, typeof DIFFICULTY_CONFIG.normal][];

  return (
    <View className='prep-page'>
      {/* 背景模糊装饰 */}
      <View className='prep-page__blur-1' />
      <View className='prep-page__blur-2' />

      {/* 返回按钮 */}
      <View className='prep-page__back' onClick={handleBack}>
        <Text className='prep-page__back-icon'>←</Text>
        <Text className='prep-page__back-text'>返回</Text>
      </View>

      {/* 学科头部 */}
      <View className={`prep-page__header ${mounted ? 'prep-page__header--mounted' : ''}`}>
        <View
          className='prep-page__subject-badge'
          style={{ background: grad.gradient, boxShadow: `0 8px 24px ${grad.shadow}` }}
        >
          <Text className='prep-page__subject-emoji'>
            {currentSubject === 'chinese' ? '📝' : currentSubject === 'math' ? '🔢' : currentSubject === 'english' ? '💬' : currentSubject === 'science' ? '⚛️' : currentSubject === 'history' ? '📜' : '🧭'}
          </Text>
          <Text className='prep-page__subject-name'>{subjectConf.label}</Text>
        </View>
        {bestScore > 0 && (
          <Text className='prep-page__best-score'>最高分: {bestScore}</Text>
        )}
      </View>

      {/* 章节选择 */}
      <View className={`prep-page__section ${mounted ? 'prep-page__section--mounted' : ''}`} style={{ transitionDelay: '0.1s' }}>
        <Text className='prep-page__section-title'>选择章节</Text>
        <View className='prep-page__chapters'>
          {Array.from({ length: MAX_CHAPTER }).map((_, i) => {
            const ch = i + 1;
            const isUnlocked = ch <= currentCh;
            const isActive = ch === chapter;
            return (
              <View
                key={ch}
                className={`prep-page__chapter ${isActive ? 'prep-page__chapter--active' : ''} ${!isUnlocked ? 'prep-page__chapter--locked' : ''}`}
                style={isActive ? { background: grad.gradient, boxShadow: `0 6px 20px ${grad.shadow}` } : {}}
                onClick={() => isUnlocked && setChapter(ch)}
              >
                <Text className='prep-page__chapter-num' style={isActive ? { color: '#fff' } : {}}>
                  {ch}
                </Text>
                <Text className='prep-page__chapter-label' style={isActive ? { color: 'rgba(255,255,255,0.8)' } : {}}>
                  第{ch}章
                </Text>
                {!isUnlocked && <Text className='prep-page__chapter-lock'>🔒</Text>}
              </View>
            );
          })}
        </View>
      </View>

      {/* 难度选择 */}
      <View className={`prep-page__section ${mounted ? 'prep-page__section--mounted' : ''}`} style={{ transitionDelay: '0.18s' }}>
        <Text className='prep-page__section-title'>选择难度</Text>
        <View className='prep-page__difficulties'>
          {diffEntries.map(([key, conf]) => {
            const isActive = key === difficulty;
            return (
              <View
                key={key}
                className={`prep-page__diff ${isActive ? 'prep-page__diff--active' : ''}`}
                style={isActive ? { borderColor: conf.color, background: `${conf.color}18` } : {}}
                onClick={() => setDifficulty(key)}
              >
                <Text
                  className='prep-page__diff-label'
                  style={isActive ? { color: conf.color, fontWeight: 700 } : { color: '#6b7280' }}
                >
                  {conf.label}
                </Text>
                <Text className='prep-page__diff-time' style={{ color: conf.color }}>
                  {conf.time}秒
                </Text>
                <Text className='prep-page__diff-score' style={{ color: conf.color }}>
                  +{conf.baseScore}分
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 规则说明 */}
      <View className={`prep-page__rules ${mounted ? 'prep-page__rules--mounted' : ''}`} style={{ transitionDelay: '0.26s' }}>
        <View className='prep-page__rule'>
          <Text className='prep-page__rule-icon'>❤️</Text>
          <Text className='prep-page__rule-text'>共 {MAX_LIVES} 条生命，答错扣一命</Text>
        </View>
        <View className='prep-page__rule'>
          <Text className='prep-page__rule-icon'>🔥</Text>
          <Text className='prep-page__rule-text'>连续答对触发 Combo 加分</Text>
        </View>
        <View className='prep-page__rule'>
          <Text className='prep-page__rule-icon'>⏱️</Text>
          <Text className='prep-page__rule-text'>剩余时间越多，加分越多</Text>
        </View>
      </View>

      {/* 开始按钮 */}
      <View className={`prep-page__start-wrap ${mounted ? 'prep-page__start-wrap--mounted' : ''}`} style={{ transitionDelay: '0.34s' }}>
        <View
          className='prep-page__start-btn'
          style={{ background: grad.gradient, boxShadow: `0 12px 32px ${grad.shadow}` }}
          onClick={handleStart}
        >
          <Text className='prep-page__start-text'>开始挑战</Text>
          <Text className='prep-page__start-sub'>第{chapter}章 · {DIFFICULTY_CONFIG[difficulty].label}</Text>
        </View>
      </View>
    </View>
  );
};

export default SubjectPrep;
