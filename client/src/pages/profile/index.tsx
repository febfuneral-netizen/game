import React, { useEffect, useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGame } from '../../store/gameContext';
import { SUBJECT_CONFIG, SUBJECT_ORDER, PROGRESS_COLOR, PROGRESS_LABEL } from '../../utils/constants';
import { getMyRank, getGlobalStats, getGameResult } from '../../services/api';
import './index.scss';

const Profile: React.FC = () => {
  const { state, doLogin } = useGame();
  const { user } = state;
  const [myRank, setMyRank] = useState<number | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [recentGames, setRecentGames] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    // 获取排名
    getMyRank().then((data) => setMyRank(data.rank)).catch(() => {});
    // 获取全局统计
    getGlobalStats().then((data) => setGlobalStats(data)).catch(() => {});
    // TODO: 获取最近游戏记录
  }, [user]);

  const handleLogin = async () => {
    await doLogin();
  };

  const subjectList = SUBJECT_ORDER.map((key) => {
    const config = SUBJECT_CONFIG[key];
    const subj = user?.subjects?.[key];
    const progress = subj?.progress || 'newbie';
    return {
      key,
      label: config.label,
      gradient: config.gradient,
      progress,
      bestScore: subj?.bestScore || 0,
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
          <View className='profile-page__login-btn' onClick={handleLogin}>
            <Text className='profile-page__login-btn-text'>微信一键登录</Text>
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
                        width: s.progress === 'cleared' ? '100%' : s.progress === 'ongoing' ? '50%' : '0%',
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

      {/* 底部菜单 */}
      <View className='profile-page__menu'>
        <View className='profile-page__menu-item'>
          <Text className='profile-page__menu-icon'>📊</Text>
          <Text className='profile-page__menu-text'>排行榜</Text>
          <Text className='profile-page__menu-arrow'>›</Text>
        </View>
        <View className='profile-page__menu-item'>
          <Text className='profile-page__menu-icon'>🏆</Text>
          <Text className='profile-page__menu-text'>挑战记录</Text>
          <Text className='profile-page__menu-arrow'>›</Text>
        </View>
        <View className='profile-page__menu-item'>
          <Text className='profile-page__menu-icon'>⚙️</Text>
          <Text className='profile-page__menu-text'>设置</Text>
          <Text className='profile-page__menu-arrow'>›</Text>
        </View>
      </View>
    </View>
  );
};

export default Profile;
