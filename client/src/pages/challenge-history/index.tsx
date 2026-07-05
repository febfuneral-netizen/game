import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { getRecentGames } from '../../services/api';
import { SUBJECT_CONFIG, DIFFICULTY_CONFIG } from '../../utils/constants';
import './index.scss';

interface GameRecord {
  id: string;
  subject: string;
  chapter: number;
  difficulty: string;
  status: string;
  correctCount: number;
  totalQuestions: number;
  score: number;
  startedAt: string;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
};

const formatTime = (isoStr: string): string => {
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}月${day}日`;
};

const ChallengeHistory: React.FC = () => {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentGames()
      .then((data) => {
        setRecords(data.list || []);
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View className='history-page'>
        <View className='history-page__loading'>
          <Text>加载中...</Text>
        </View>
      </View>
    );
  }

  if (records.length === 0) {
    return (
      <View className='history-page'>
        <View className='history-page__empty'>
          <Text className='history-page__empty-icon'>📋</Text>
          <Text className='history-page__empty-title'>暂无挑战记录</Text>
          <Text className='history-page__empty-desc'>快去首页选择学科开始答题吧</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className='history-page' scrollY>
      <View className='history-page__list'>
        {records.map((rec) => {
          const subjectCfg = SUBJECT_CONFIG[rec.subject];
          const accuracy = rec.totalQuestions > 0
            ? Math.round((rec.correctCount / rec.totalQuestions) * 100)
            : 0;
          const accuracyColor = accuracy >= 80 ? '#22C55E' : accuracy >= 50 ? '#F59E0B' : '#EF4444';

          return (
            <View key={rec.id} className='history-item'>
              <View className='history-item__left'>
                <View
                  className='history-item__icon'
                  style={{ background: subjectCfg?.gradient || 'linear-gradient(135deg, #7C5CFF, #A855F7)' }}
                >
                  <Text className='history-item__icon-text'>
                    {subjectCfg?.label?.charAt(0) || '?'}
                  </Text>
                </View>
              </View>
              <View className='history-item__body'>
                <View className='history-item__header'>
                  <Text className='history-item__subject'>{subjectCfg?.label || rec.subject}</Text>
                  <Text className='history-item__chapter'>第{rec.chapter}章</Text>
                  <View className='history-item__difficulty'>
                    <Text className='history-item__diff-text'>{DIFFICULTY_LABEL[rec.difficulty] || rec.difficulty}</Text>
                  </View>
                </View>
                <View className='history-item__meta'>
                  <Text className='history-item__time'>{formatTime(rec.startedAt)}</Text>
                  <Text className='history-item__accuracy' style={{ color: accuracyColor }}>
                    {rec.correctCount}/{rec.totalQuestions} ({accuracy}%)
                  </Text>
                </View>
              </View>
              <View className='history-item__score'>
                <Text className='history-item__score-num'>{rec.score}</Text>
                <Text className='history-item__score-label'>分</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

export default ChallengeHistory;
