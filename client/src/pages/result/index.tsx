import React, { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGame } from '../../store/gameContext';
import { getGameResult } from '../../services/api';
import { subjectLabel } from '../../utils/helpers';
import { TOTAL_QUESTIONS } from '../../utils/constants';
import './index.scss';

const Result: React.FC = () => {
  const { state, dispatch } = useGame();
  const { status, currentSubject, questions, gameId } = state;
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);
  const [confettiPieces] = useState(() =>
    Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      color: ['#FFD700', '#FF69B4', '#7C5CFF', '#22C55E', '#FF6B6B'][i % 5],
    }))
  );

  const isWin = status === 'SETTLE_WIN';

  useEffect(() => {
    if (!gameId) return;
    getGameResult(gameId)
      .then((data) => setGameResult(data))
      .catch((err) => console.error('获取游戏结果失败:', err));
  }, [gameId]);

  useEffect(() => {
    if (isWin) setShowConfetti(true);
  }, [isWin]);

  const handleGoHome = () => {
    dispatch({ type: 'RESET' });
    Taro.reLaunch({ url: '/pages/index/index' });
  };

  const handleRetry = () => {
    dispatch({ type: 'RESET' });
    Taro.redirectTo({ url: `/pages/quiz/index?subject=${currentSubject}` });
  };

  const correctCount = gameResult?.correctCount ?? 0;
  const totalQuestions = gameResult?.totalQuestions ?? questions.length;
  const score = gameResult?.score ?? 0;
  const perfect = correctCount === totalQuestions;

  // 星级：0题→0星，<一半→1星，<全部→2星，全对→3星
  const stars = correctCount === 0 ? 0
    : correctCount < Math.ceil(totalQuestions / 2) ? 1
    : correctCount < totalQuestions ? 2 : 3;

  return (
    <View className='result-page'>
      {/* 彩带效果 */}
      {showConfetti && (
        <View className='result-page__confetti'>
          {confettiPieces.map((p) => (
            <View
              key={p.id}
              className='result-page__confetti-piece'
              style={{
                left: p.left,
                animationDelay: p.delay,
                background: p.color,
              }}
            />
          ))}
        </View>
      )}

      <View className='result-page__content'>
        {/* 标题 */}
        <View className='result-page__title'>
          {perfect ? '恭喜你闯关成功！' : correctCount > 0 ? '答题结束' : '很遗憾，再试一次吧'}
        </View>

        {/* 星星 */}
        <View className='result-page__stars'>
          {[0, 1, 2].map((i) => (
            <Text
              key={i}
              className='result-page__star'
              style={{
                opacity: i < stars ? 1 : 0.22,
                transform: i < stars ? 'scale(1)' : 'scale(0.4)',
                filter: i < stars ? 'drop-shadow(0 2px 10px #fbbf24)' : 'none',
              }}
            >
              ⭐
            </Text>
          ))}
        </View>

        {/* 头像光环 */}
        <View className='result-page__avatar-ring'>
          <View className='result-page__avatar'>
            <Text className='result-page__avatar-emoji'>
              {perfect ? '🏆' : '😊'}
            </Text>
          </View>
        </View>

        {/* 得分徽章 */}
        <View className='result-page__score-badge'>
          得分 {score} / {totalQuestions}
        </View>

        {/* 学科 */}
        <View className='result-page__subject'>
          {subjectLabel(currentSubject || '')}
        </View>

        {/* 统计卡片 */}
        <View className='result-page__card'>
          <Text className='result-page__card-title'>答题统计</Text>
          <View className='result-page__stats'>
            <View className='result-page__stat'>
              <Text className='result-page__stat-value'>{correctCount}</Text>
              <Text className='result-page__stat-label'>答对</Text>
            </View>
            <View className='result-page__stat'>
              <Text className='result-page__stat-value'>{totalQuestions}</Text>
              <Text className='result-page__stat-label'>题目</Text>
            </View>
            <View className='result-page__stat'>
              <Text className='result-page__stat-value'>{score}</Text>
              <Text className='result-page__stat-label'>得分</Text>
            </View>
          </View>
        </View>

        {/* 鼓励文案 */}
        <View className='result-page__message'>
          {perfect
            ? '闯关奖励结算中...'
            : `答对了 ${correctCount} 道题，继续加油！`}
        </View>

        {/* 按钮组 */}
        <View
          className='result-page__btn result-page__btn--primary'
          onClick={handleRetry}
        >
          <Text className='result-page__btn-text'>再来一次</Text>
        </View>
        <View
          className='result-page__btn result-page__btn--secondary'
          onClick={handleGoHome}
        >
          <Text>返回首页</Text>
        </View>
      </View>
    </View>
  );
};

export default Result;
