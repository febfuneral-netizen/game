// 生命值显示组件 — 复用答题页视觉风格
import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

interface LifeHeartsProps {
  lives: number;
  maxLives?: number;
}

const LifeHearts: React.FC<LifeHeartsProps> = ({ lives, maxLives = 3 }) => {
  return (
    <View className='life-hearts'>
      {Array.from({ length: maxLives }).map((_, i) => (
        <Text
          key={i}
          className={`life-hearts__icon ${i < lives ? 'life-hearts__icon--alive' : 'life-hearts__icon--dead'}`}
        >
          {i < lives ? '❤️' : '🖤'}
        </Text>
      ))}
    </View>
  );
};

export default LifeHearts;
