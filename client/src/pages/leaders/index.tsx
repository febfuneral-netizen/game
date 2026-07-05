import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getLeaderboard, getMyRank } from '../../services/api';
import { SUBJECT_CONFIG, SUBJECT_ORDER } from '../../utils/constants';
import './index.scss';

interface LeaderItem {
  rank: number;
  _id?: string;
  nickname: string;
  totalScore: number;
  subjects?: Record<string, { bestScore: number }>;
}

const Leaders: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const [list, setList] = useState<LeaderItem[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { key: 'all', label: '总榜' },
    ...SUBJECT_ORDER.map((k) => ({ key: k, label: SUBJECT_CONFIG[k].label })),
  ];

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const subject = activeTab === 'all' ? undefined : activeTab;
      const [data, rankData] = await Promise.all([
        getLeaderboard(subject, 50),
        getMyRank(subject),
      ]);
      setList(
        (data.list || []).map((item: any, idx: number) => ({
          ...item,
          rank: idx + 1,
          nickname: item.nickname || '玩家',
        }))
      );
      setMyRank(rankData.rank);
    } catch {
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const getRankClass = (rank: number) => {
    if (rank === 1) return 'leaders__rank--gold';
    if (rank === 2) return 'leaders__rank--silver';
    if (rank === 3) return 'leaders__rank--bronze';
    return '';
  };

  return (
    <View className='leaders'>
      {/* 我的排名 */}
      <View className='leaders__me'>
        <View className='leaders__me-card'>
          <Text className='leaders__me-label'>我的排名</Text>
          <Text className='leaders__me-rank'>#{myRank || '--'}</Text>
        </View>
      </View>

      {/* 学科切换 */}
      <ScrollView className='leaders__tabs' scrollX enableFlex>
        {tabs.map((t) => (
          <View
            key={t.key}
            className={`leaders__tab${activeTab === t.key ? ' leaders__tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <Text className='leaders__tab-text'>{t.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 榜单 */}
      {loading ? (
        <View className='leaders__loading'>
          <Text>加载中...</Text>
        </View>
      ) : (
        <ScrollView className='leaders__list' scrollY>
          {list.length === 0 ? (
            <View className='leaders__empty'>
              <Text className='leaders__empty-icon'>🏆</Text>
              <Text className='leaders__empty-text'>暂无数据</Text>
            </View>
          ) : (
            list.map((item) => (
              <View key={item.rank} className={`leaders__item ${getRankClass(item.rank)}`}>
                <View className={`leaders__rank ${getRankClass(item.rank)}`}>
                  <Text className='leaders__rank-num'>{item.rank}</Text>
                </View>
                <View className='leaders__avatar'>
                  <Text className='leaders__avatar-text'>
                    {item.nickname?.charAt(0) || '玩'}
                  </Text>
                </View>
                <View className='leaders__info'>
                  <Text className='leaders__name'>{item.nickname}</Text>
                </View>
                <View className='leaders__score'>
                  <Text className='leaders__score-num'>{item.totalScore}</Text>
                  <Text className='leaders__score-label'>分</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default Leaders;
