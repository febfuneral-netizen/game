import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGame } from '../../store/gameContext';
import { SUBJECT_CONFIG, SUBJECT_ORDER, PROGRESS_COLOR, PROGRESS_LABEL } from '../../utils/constants';
import { getMyRank, getGlobalStats } from '../../services/api';
import './index.scss';

const Profile: React.FC = () => {
  const { state, doLogin, doLogout, isLoggingIn } = useGame();
  const { user } = state;
  const [myRank, setMyRank] = useState<number | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    getMyRank().then((data) => setMyRank(data.rank)).catch(() => {});
    getGlobalStats().then((data) => setGlobalStats(data)).catch(() => {});
  }, [user]);

  const handleLogin = async () => {
    await doLogin();
  };

  const subjectList = SUBJECT_ORDER.map((key) => {
    const config = SUBJECT_CONFIG[key];
    const subj = user?.subjects?.[key];
    const progress = subj?.progress || 'newbie';
    const chapter = subj?.currentChapter || 1;
    const chapterPct = Math.min(Math.round((chapter / 5) * 100), 100);
    return {
      key,
      label: config.label,
      gradient: config.gradient,
      progress,
      bestScore: subj?.bestScore || 0,
      currentChapter: chapter,
      chapterPct,
      color: PROGRESS_COLOR[progress],
      statusLabel: PROGRESS_LABEL[progress],
    };
  });

  // 统计已通关数量
  const clearedCount = subjectList.filter((s) => s.progress === 'cleared').length;

  if (!user) {
    return (
      <View className='profile-page'>
        <View className='profile-page__empty'>
          <View className='profile-page__empty-icon'>
            <Text className='profile-page__empty-emoji'>👤</Text>
          </View>
          <Text className='profile-page__empty-title'>未登录</Text>
          <Text className='profile-page__empty-desc'>登录后查看个人数据和排名</Text>
          <View
            className={`profile-page__login-btn${isLoggingIn ? ' profile-page__login-btn--loading' : ''}`}
            onClick={isLoggingIn ? undefined : handleLogin}
          >
            <Text className='profile-page__login-btn-text'>
              {isLoggingIn ? '登录中...' : '微信一键登录'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className='profile-page'>
      {/* 顶部用户信息卡片 */}
      <View className='profile-page__header'>
        <View className='profile-page__header-bg' />
        <View className='profile-page__user-card'>
          <View className='profile-page__avatar'>
            <Text className='profile-page__avatar-text'>
              {user.nickname?.charAt(0) || '玩'}
            </Text>
          </View>
          <View className='profile-page__user-info'>
            <Text className='profile-page__nickname'>{user.nickname}</Text>
            {user.title && (
              <View className='profile-page__title-row'>
                <Text className='profile-page__title-emoji'>{user.title.emoji}</Text>
                <Text className='profile-page__title-name' style={{ color: user.title.color }}>
                  {user.title.name}
                </Text>
              </View>
            )}
            <Text className='profile-page__uid'>ID: {user.id?.slice(-8) || '---'}</Text>
          </View>
          <View className='profile-page__rank-badge'>
            <Text className='profile-page__rank-num'>#{myRank || '--'}</Text>
            <Text className='profile-page__rank-label'>排名</Text>
          </View>
        </View>
      </View>

      {/* 数据概览 */}
      <View className='profile-page__stats'>
        <View className='profile-page__stat-item'>
          <Text className='profile-page__stat-value'>{user.totalScore}</Text>
          <Text className='profile-page__stat-label'>总分</Text>
        </View>
        <View className='profile-page__stat-divider' />
        <View className='profile-page__stat-item'>
          <Text className='profile-page__stat-value'>{clearedCount}/6</Text>
          <Text className='profile-page__stat-label'>已通关</Text>
        </View>
        <View className='profile-page__stat-divider' />
        <View className='profile-page__stat-item'>
          <Text className='profile-page__stat-value'>{globalStats?.todayGames || 0}</Text>
          <Text className='profile-page__stat-label'>今日答题</Text>
        </View>
      </View>

      {/* 学科进度 */}
      <View className='profile-page__section'>
        <Text className='profile-page__section-title'>学科进度</Text>
        <View className='profile-page__subject-list'>
          {subjectList.map((s) => (
            <View key={s.key} className='profile-page__subject-item'>
              <View className='profile-page__subject-header'>
                <View
                  className='profile-page__subject-icon'
                  style={{ background: s.gradient }}
                >
                  <Text className='profile-page__subject-emoji'>
                    {s.progress === 'cleared' ? '🌟' : s.progress === 'ongoing' ? '📖' : '📚'}
                  </Text>
                </View>
                <View className='profile-page__subject-info'>
                  <Text className='profile-page__subject-name'>{s.label}</Text>
                  <View className='profile-page__subject-bar'>
                    <View
                      className='profile-page__subject-bar-fill'
                      style={{
                        width: s.progress === 'cleared' ? '100%' : `${Math.max(s.chapterPct, 20)}%`,
                        background: s.gradient,
                      }}
                    />
                  </View>
                </View>
                <View className='profile-page__subject-right'>
                  <Text className='profile-page__subject-score'>{s.bestScore}分</Text>
                  <View
                    className='profile-page__subject-badge'
                    style={{ background: s.color }}
                  >
                    {s.statusLabel}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 称号 & 成就 */}
      {user?.achievements && user.achievements.length > 0 && (
        <View className='profile-page__section'>
          <Text className='profile-page__section-title'>🏆 成就徽章</Text>
          <View className='profile-page__achievement-grid'>
            {user.achievements.map((a) => (
              <View
                key={a.id}
                className={`profile-page__achievement-item ${a.unlocked ? '' : 'profile-page__achievement-item--locked'}`}
              >
                <Text className='profile-page__achievement-emoji'>
                  {a.unlocked ? a.emoji : '🔒'}
                </Text>
                <Text className='profile-page__achievement-name'>
                  {a.name}
                </Text>
                <Text className='profile-page__achievement-desc'>
                  {a.unlocked ? a.desc : '尚未达成'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 底部菜单 */}
      <View className='profile-page__menu'>
        <View className='profile-page__menu-item' onClick={() => Taro.navigateTo({ url: '/pages/shop/index' })}>
          <Text className='profile-page__menu-icon'>🛒</Text>
          <Text className='profile-page__menu-text'>积分商城</Text>
          <Text className='profile-page__menu-arrow'>›</Text>
        </View>
        <View className='profile-page__menu-item' onClick={() => Taro.navigateTo({ url: '/pages/backpack/index' })}>
          <Text className='profile-page__menu-icon'>🎒</Text>
          <Text className='profile-page__menu-text'>我的背包</Text>
          <Text className='profile-page__menu-arrow'>›</Text>
        </View>
        <View className='profile-page__menu-item' onClick={() => Taro.navigateTo({ url: '/pages/leaders/index' })}>
          <Text className='profile-page__menu-icon'>📊</Text>
          <Text className='profile-page__menu-text'>排行榜</Text>
          <Text className='profile-page__menu-arrow'>›</Text>
        </View>
        <View className='profile-page__menu-item' onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
          <Text className='profile-page__menu-icon'>🏆</Text>
          <Text className='profile-page__menu-text'>挑战记录</Text>
          <Text className='profile-page__menu-arrow'>›</Text>
        </View>
        <View className='profile-page__menu-item' onClick={() => Taro.showToast({ title: '功能开发中', icon: 'none' })}>
          <Text className='profile-page__menu-icon'>⚙️</Text>
          <Text className='profile-page__menu-text'>设置</Text>
          <Text className='profile-page__menu-arrow'>›</Text>
        </View>
        <View className='profile-page__menu-item profile-page__menu-item--logout' onClick={doLogout}>
          <Text className='profile-page__menu-icon'>🚪</Text>
          <Text className='profile-page__menu-text'>退出登录</Text>
          <Text className='profile-page__menu-arrow'>›</Text>
        </View>
      </View>


    </View>
  );
};

export default Profile;
