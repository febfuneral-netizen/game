// Combo 弹出组件 — combo ≥ 2 时触发，复用答题页动效风格
import React, { useEffect, useRef } from 'react';
import { View, Text } from '@tarojs/components';
import { COMBO_POPUP, COMBO_POPUP as C } from '../../utils/constants';
import './index.scss';

interface ComboPopupProps {
  combo: number;
  visible: boolean;
  onDone?: () => void;
}

const ComboPopup: React.FC<ComboPopupProps> = ({ combo, visible, onDone }) => {
  const timerRef = useRef<number>();

  // 找到当前 combo 对应的配置（取 ≤ combo 的最大阈值）
  const getConfig = () => {
    const thresholds = Object.keys(C.labels)
      .map(Number)
      .sort((a, b) => b - a);
    for (const t of thresholds) {
      if (combo >= t) return { threshold: t, ...C.labels[t] };
    }
    return null;
  };

  const config = visible ? getConfig() : null;

  useEffect(() => {
    if (!visible || !config) return;
    timerRef.current = setTimeout(() => onDone?.(), 1200);
    return () => clearTimeout(timerRef.current);
  }, [visible, combo]);

  if (!visible || !config) return null;

  const isGodlike = config.level === 'godlike';
  const isCritical = config.level === 'critical';
  const isFire = config.level === 'fire';

  return (
    <View className={`combo-popup combo-popup--${config.level}`}>
      {/* 背景光晕 */}
      <View className='combo-popup__glow' />
      <View className='combo-popup__glow combo-popup__glow--2' />

      {/* 主内容 */}
      <View className='combo-popup__content'>
        <Text className='combo-popup__emoji'>{config.emoji}</Text>
        <Text className='combo-popup__text'>{config.text}</Text>
        <View className='combo-popup__divider' />
        <Text className='combo-popup__sub'>{config.sub}</Text>
        <Text className='combo-popup__count'>
          {combo}× COMBO
        </Text>
      </View>

      {/* 粒子装饰 */}
      {(isFire || isCritical || isGodlike) && (
        <View className='combo-popup__particles'>
          {Array.from({ length: 12 }).map((_, i) => (
            <View
              key={i}
              className={`combo-popup__particle combo-popup__particle--${i % 3}`}
              style={{
                // 使用 transform 兼容 WXSS
                animationDelay: `${i * 0.06}s`,
              } as any}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export default ComboPopup;
