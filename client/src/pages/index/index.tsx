import React, { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGame } from '../../store/gameContext';
import { SUBJECT_ORDER } from '../../utils/constants';
import SubjectCard from '../../components/SubjectCard';
import './index.scss';

const Index: React.FC = () => {
  const { state, dispatch, doLogin, doStartGame } = useGame();
  const { user, questionCount } = state;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubjectClick = async (subjectKey: string) => {
    if (!user) {
      await doLogin();
      const token = Taro.getStorageSync('token');
      if (!token) return;
    }
    // 跳转到准备页，而不是直接开始游戏
    dispatch({ type: 'SELECT_SUBJECT', payload: subjectKey });
    Taro.navigateTo({ url: '/pages/subject-prep/index' });
  };

  const handleBattleClick = () => {
    Taro.switchTab({ url: '/pages/challenge/index' });
  };

  const handleProfileClick = async () => {
    if (!user) {
      await doLogin();
    }
    Taro.switchTab({ url: '/pages/profile/index' });
  };

  // 学科渐变色
  const subjectGradients: Record<string, { gradient: string; shadow: string }> = {
    chinese:   { gradient: 'linear-gradient(135deg, #f97060, #ffb199)', shadow: 'rgba(249,112,96,0.4)' },
    math:      { gradient: 'linear-gradient(135deg, #3b9eff, #7ad4ff)', shadow: 'rgba(59,158,255,0.4)' },
    english:   { gradient: 'linear-gradient(135deg, #a259ff, #e879f9)', shadow: 'rgba(162,89,255,0.4)' },
    science:   { gradient: 'linear-gradient(135deg, #10b981, #6ee7b7)', shadow: 'rgba(16,185,129,0.4)' },
    history:   { gradient: 'linear-gradient(135deg, #f59e0b, #fde68a)', shadow: 'rgba(245,158,11,0.4)' },
    geography: { gradient: 'linear-gradient(135deg, #6366f1, #a5b4fc)', shadow: 'rgba(99,102,241,0.4)' },
  };

  const subjectLevels: Record<string, number> = {
    chinese: 1, math: 2, english: 3, science: 1, history: 2, geography: 1,
  };

  return (
    <View className='index-page'>
      <View className='index-page__inner'>
        {/* Header: 双语标题 + 对战按钮 + 头像 */}
        <View className='index-page__header'>
          <View className='index-page__header-left'>
            <Text className='index-page__title-cn'>想一想看一看</Text>
            <Text className='index-page__title-en'>Let's Play</Text>
          </View>
          <View className='index-page__header-right'>
            <View className='index-page__battle-btn' onClick={handleBattleClick}>
              <Text className='index-page__battle-icon'>⚔️</Text>
              <Text className='index-page__battle-text'>对战</Text>
            </View>
            <View className='index-page__profile-btn' onClick={handleProfileClick}>
              <Text className='index-page__profile-avatar'>
                {user?.nickname?.charAt(0) || '?'}
              </Text>
            </View>
          </View>
        </View>

        {/* 竖向卡片列表 */}
        <View className='index-page__list'>
          {SUBJECT_ORDER.map((key, index) => {
            const grad = subjectGradients[key] || subjectGradients.math;
            const level = subjectLevels[key] || 1;
            return (
              <View
                key={key}
                className='index-page__card-wrapper'
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.95)',
                  transition: `all 0.45s cubic-bezier(0.23, 1, 0.32, 1) ${0.06 + index * 0.06}s`,
                }}
              >
                <SubjectCard
                  subjectKey={key}
                  gradient={grad.gradient}
                  shadowColor={grad.shadow}
                  level={level}
                  progress={user?.subjects?.[key]}
                  questionCount={questionCount[key] || 0}
                  onClick={() => handleSubjectClick(key)}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* 底部信息 */}
      <View className='index-page__footer'>
        <View className='index-page__footer-bg'>
          <Text className='index-page__footer-text'>QUIZ CHALLENGE</Text>
        </View>
      </View>
    </View>
  );
};

export default Index;
