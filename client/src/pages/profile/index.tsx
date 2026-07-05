import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGame } from '../../store/gameContext';
import { SUBJECT_CONFIG, SUBJECT_ORDER, PROGRESS_COLOR, PROGRESS_LABEL } from '../../utils/constants';
import { getMyRank, getRecentGames, getChallengeStats, updateProfile } from '../../services/api';
import './index.scss';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};

const formatRelativeTime = (isoStr: string): string => {
  const d = new Date(isoStr);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}天前`;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}月${day}日`;
};

const Profile: React.FC = () => {
  const { state, dispatch, doLogin, doLogout, isLoggingIn } = useGame();
  const { user } = state;
  const [myRank, setMyRank] = useState<number | null>(null);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [saving, setSaving] = useState(false);

  const handleEditNickname = () => {
    setEditNickname(user?.nickname || '');
    setShowEditModal(true);
  };

  const handleSaveNickname = async () => {
    const trimmed = editNickname.trim();
    if (!trimmed) {
      Taro.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    if (trimmed.length > 20) {
      Taro.showToast({ title: '昵称不能超过20个字符', icon: 'none' });
      return;
    }
    setSaving(true);
    try {
      const data = await updateProfile({ nickname: trimmed });
      dispatch({ type: 'SET_USER', payload: data.user });
      setShowEditModal(false);
      Taro.showToast({ title: '昵称修改成功', icon: 'success' });
    } catch (err: any) {
      Taro.showToast({ title: err.message || '修改失败', icon: 'none' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    getMyRank().then((data) => setMyRank(data.rank)).catch(() => {});
    getRecentGames().then((data) => setRecentGames((data.list || []).slice(0, 3))).catch(() => {});
    getChallengeStats().then((data) => setStreak(data.streak || 0)).catch(() => {});
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
            <View className='profile-page__nickname-row' onClick={handleEditNickname}>
              <Text className='profile-page__nickname'>{user.nickname}</Text>
              <View className='profile-page__edit-badge'>
                <Text className='profile-page__edit-text'>修改</Text>
              </View>
            </View>
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
          <Text className='profile-page__stat-value profile-page__stat-value--purple'>{user.totalScore}</Text>
          <Text className='profile-page__stat-label'>总分</Text>
        </View>
        <View className='profile-page__stat-divider' />
        <View className='profile-page__stat-item'>
          <Text className='profile-page__stat-value profile-page__stat-value--green'>{clearedCount}/6</Text>
          <Text className='profile-page__stat-label'>已通关</Text>
        </View>
        <View className='profile-page__stat-divider' />
        <View className='profile-page__stat-item'>
          <Text className='profile-page__stat-value profile-page__stat-value--orange'>{streak}</Text>
          <Text className='profile-page__stat-label'>连续签到</Text>
        </View>
        <View className='profile-page__stat-divider' />
        <View className='profile-page__stat-item'>
          <Text className='profile-page__stat-value profile-page__stat-value--blue'>{myRank ? `#${myRank}` : '--'}</Text>
          <Text className='profile-page__stat-label'>全球排名</Text>
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

      {/* 最近挑战 */}
      {recentGames.length > 0 && (
        <View className='profile-page__section'>
          <View className='profile-page__section-header'>
            <Text className='profile-page__section-title'>📋 最近挑战</Text>
            <Text
              className='profile-page__section-more'
              onClick={() => Taro.navigateTo({ url: '/pages/challenge-history/index' })}
            >
              查看全部 ›
            </Text>
          </View>
          <View className='profile-page__recent-list'>
            {recentGames.map((rec) => {
              const subjCfg = SUBJECT_CONFIG[rec.subject];
              const accuracy = rec.totalQuestions > 0
                ? Math.round((rec.correctCount / rec.totalQuestions) * 100)
                : 0;
              const accColor = accuracy >= 80 ? '#22C55E' : accuracy >= 50 ? '#F59E0B' : '#EF4444';
              return (
                <View key={rec.id} className='profile-page__recent-item'>
                  <View
                    className='profile-page__recent-icon'
                    style={{ background: subjCfg?.gradient || 'linear-gradient(135deg, #7C5CFF, #A855F7)' }}
                  >
                    <Text className='profile-page__recent-icon-text'>
                      {subjCfg?.label?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View className='profile-page__recent-body'>
                    <View className='profile-page__recent-top'>
                      <Text className='profile-page__recent-subject'>{subjCfg?.label || rec.subject}</Text>
                      <Text className='profile-page__recent-chapter'>第{rec.chapter}章</Text>
                      <Text className='profile-page__recent-diff'>{DIFFICULTY_LABEL[rec.difficulty] || rec.difficulty}</Text>
                    </View>
                    <View className='profile-page__recent-meta'>
                      <Text className='profile-page__recent-time'>{formatRelativeTime(rec.startedAt)}</Text>
                      <Text className='profile-page__recent-accuracy' style={{ color: accColor }}>
                        答对 {rec.correctCount}/{rec.totalQuestions}
                      </Text>
                    </View>
                  </View>
                  <View className='profile-page__recent-score'>
                    <Text className='profile-page__recent-score-num'>{rec.score}</Text>
                    <Text className='profile-page__recent-score-label'>分</Text>
                  </View>
                </View>
              );
            })}
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
        <View className='profile-page__menu-item' onClick={() => Taro.navigateTo({ url: '/pages/challenge-history/index' })}>
          <Text className='profile-page__menu-icon'>🏆</Text>
          <Text className='profile-page__menu-text'>挑战记录</Text>
          <Text className='profile-page__menu-arrow'>›</Text>
        </View>
        <View className='profile-page__menu-item' onClick={() => Taro.navigateTo({ url: '/pages/settings/index' })}>
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

      {/* 修改昵称弹窗 */}
      {showEditModal && (
        <View className='profile-page__modal-mask' onClick={() => setShowEditModal(false)}>
          <View className='profile-page__modal' onClick={(e) => e.stopPropagation()}>
            <Text className='profile-page__modal-title'>修改昵称</Text>
            <View className='profile-page__modal-input-wrap'>
              <Input
                className='profile-page__modal-input'
                value={editNickname}
                onInput={(e) => setEditNickname(e.detail.value)}
                placeholder='请输入新昵称'
                maxlength={20}
                focus={true}
              />
            </View>
            <Text className='profile-page__modal-hint'>1-20个字符</Text>
            <View className='profile-page__modal-actions'>
              <View
                className='profile-page__modal-btn profile-page__modal-btn--cancel'
                onClick={() => setShowEditModal(false)}
              >
                <Text>取消</Text>
              </View>
              <View
                className={`profile-page__modal-btn profile-page__modal-btn--confirm${saving ? ' profile-page__modal-btn--loading' : ''}`}
                onClick={saving ? undefined : handleSaveNickname}
              >
                <Text>{saving ? '保存中...' : '保存'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

    </View>
  );
};

export default Profile;
