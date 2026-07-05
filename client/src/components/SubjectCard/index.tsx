// 学科卡片 — 匹配参考设计：宽卡片 + 状态标签 + 动态图标 + 点击反馈
import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import { SUBJECT_CONFIG } from '../../utils/constants';
import { SubjectProgress } from '../../store/gameContext';
import './index.scss';

interface SubjectCardProps {
  subjectKey: string;
  gradient?: string;
  shadowColor?: string;
  level?: number;
  progress?: SubjectProgress;
  questionCount?: number;
  onClick: () => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({
  subjectKey,
  gradient = SUBJECT_CONFIG[subjectKey]?.gradient || 'linear-gradient(135deg, #7C5CFF, #A855F7)',
  shadowColor = 'rgba(124,92,255,0.4)',
  level = 1,
  progress,
  questionCount = 0,
  onClick,
}) => {
  const [pressed, setPressed] = useState(false);
  const label = SUBJECT_CONFIG[subjectKey]?.label || subjectKey;
  const pct = progress?.progress || 'newbie';
  const isLocked = pct === 'locked';

  // 状态元信息
  const statusMeta = {
    newbie:  { label: '新手上路', icon: '◎' },
    ongoing: { label: '继续学习', icon: '▶' },
    cleared: { label: '已通关',   icon: '✓' },
    locked:  { label: '未解锁',   icon: '🔒' },
  };
  const meta = statusMeta[pct] || statusMeta.newbie;

  // 学科图标（参考设计中的拟物/剪影风格）
  const subjectIcons: Record<string, string> = {
    chinese: '📝',
    math: '🔢',
    english: '💬',
    science: '⚛️',
    history: '📜',
    geography: '🧭',
  };

  const handleTouchStart = () => !isLocked && setPressed(true);
  const handleTouchEnd = () => setPressed(false);

  return (
    <View
      className={`subject-card ${isLocked ? 'subject-card--locked' : ''} ${pressed ? 'subject-card--pressed' : ''}`}
      style={{
        background: gradient,
        boxShadow: `0 12px 28px ${shadowColor}`,
      }}
      onClick={isLocked ? undefined : onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* 光泽装饰 */}
      <View className='subject-card__shine' />
      <View className='subject-card__shine2' />

      {/* 内容区 */}
      <View className='subject-card__content'>
        <View className='subject-card__left'>
          {/* 状态圆圈 */}
          <View className='subject-card__status-circle'>
            <Text className='subject-card__status-icon'>{meta.icon}</Text>
          </View>

          {/* 学科信息 */}
          <View className='subject-card__info'>
            <View className='subject-card__level-row'>
              <Text className='subject-card__level'>level {level}</Text>
              <Text className='subject-card__dot'>·</Text>
              <Text className='subject-card__status-label'>{meta.label}</Text>
            </View>
            <Text className='subject-card__name'>{label}</Text>
            <Text className='subject-card__desc'>
              {isLocked ? '尚未解锁' : `${questionCount} 题 · 点击挑战`}
            </Text>
          </View>
        </View>

        {/* 右侧图标（动态浮动） */}
        <View className='subject-card__icon-wrap'>
          <View className='subject-card__icon-bg'>
            <Text className='subject-card__icon-emoji'>{subjectIcons[subjectKey] || '📚'}</Text>
          </View>
        </View>
      </View>

      {/* 锁定覆盖层 */}
      {isLocked && (
        <View className='subject-card__locked-overlay'>
          <Text className='subject-card__locked-icon'>🔒</Text>
        </View>
      )}
    </View>
  );
};

export default SubjectCard;
