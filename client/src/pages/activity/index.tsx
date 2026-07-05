import React, { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

const Activity: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <View className='activity-page'>
      {/* 顶部装饰 */}
      <View className='activity-page__bg-decor'>
        <View className='activity-page__circle activity-page__circle--1' />
        <View className='activity-page__circle activity-page__circle--2' />
        <View className='activity-page__circle activity-page__circle--3' />
      </View>

      <View className='activity-page__inner'>
        {/* 标题区域 */}
        <View
          className='activity-page__hero'
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
          }}
        >
          <Text className='activity-page__hero-icon'>🎪</Text>
          <Text className='activity-page__hero-title'>精彩活动</Text>
          <Text className='activity-page__hero-sub'>
            参与限时活动挑战，赢取专属奖励
          </Text>
        </View>

        {/* 活动卡片列表 */}
        <View
          className='activity-page__list'
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1) 0.15s',
          }}
        >
          {/* 占位活动卡片 */}
          <View className='activity-card activity-card--coming'>
            <View className='activity-card__header'>
              <View className='activity-card__tag'>
                <Text className='activity-card__tag-text'>即将开启</Text>
              </View>
              <Text className='activity-card__date'>敬请期待</Text>
            </View>
            <View className='activity-card__body'>
              <Text className='activity-card__icon'>🏆</Text>
              <View className='activity-card__info'>
                <Text className='activity-card__name'>闯关达人挑战赛</Text>
                <Text className='activity-card__desc'>
                  限定时间内完成指定题库挑战，排名赢取专属称号和积分奖励
                </Text>
              </View>
            </View>
            <View className='activity-card__footer'>
              <View className='activity-card__badge'>
                <Text>🎁 丰富奖励</Text>
              </View>
              <View className='activity-card__badge'>
                <Text>👑 专属称号</Text>
              </View>
              <View className='activity-card__badge'>
                <Text>📊 排行榜</Text>
              </View>
            </View>
          </View>

          <View className='activity-card activity-card--coming'>
            <View className='activity-card__header'>
              <View className='activity-card__tag'>
                <Text className='activity-card__tag-text'>即将开启</Text>
              </View>
              <Text className='activity-card__date'>敬请期待</Text>
            </View>
            <View className='activity-card__body'>
              <Text className='activity-card__icon'>🎯</Text>
              <View className='activity-card__info'>
                <Text className='activity-card__name'>学科知识竞赛</Text>
                <Text className='activity-card__desc'>
                  各学科专项挑战赛，检验你的知识储备，与好友一决高下
                </Text>
              </View>
            </View>
            <View className='activity-card__footer'>
              <View className='activity-card__badge'>
                <Text>🏅 竞赛积分</Text>
              </View>
              <View className='activity-card__badge'>
                <Text>🤝 好友对战</Text>
              </View>
              <View className='activity-card__badge'>
                <Text>📋 专项题库</Text>
              </View>
            </View>
          </View>

          <View className='activity-card activity-card--coming'>
            <View className='activity-card__header'>
              <View className='activity-card__tag'>
                <Text className='activity-card__tag-text'>即将开启</Text>
              </View>
              <Text className='activity-card__date'>敬请期待</Text>
            </View>
            <View className='activity-card__body'>
              <Text className='activity-card__icon'>🎉</Text>
              <View className='activity-card__info'>
                <Text className='activity-card__name'>节日特别活动</Text>
                <Text className='activity-card__desc'>
                  节假日限定趣味答题，参与即可领取节日专属礼包和限定装饰
                </Text>
              </View>
            </View>
            <View className='activity-card__footer'>
              <View className='activity-card__badge'>
                <Text>🎁 限定礼包</Text>
              </View>
              <View className='activity-card__badge'>
                <Text>🎨 限定装饰</Text>
              </View>
              <View className='activity-card__badge'>
                <Text>⏰ 限时开放</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Activity;
