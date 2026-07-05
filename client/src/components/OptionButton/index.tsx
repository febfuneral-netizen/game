import React from 'react';
import { View, Text } from '@tarojs/components';
import './index.scss';

type OptionState = 'default' | 'selected' | 'correct' | 'wrong' | 'disabled';

interface OptionButtonProps {
  id: string;
  text: string;
  state?: OptionState;
  disabled?: boolean;
  correctGradient?: string;
  onClick?: (id: string) => void;
}

const OptionButton: React.FC<OptionButtonProps> = ({
  id,
  text,
  state = 'default',
  disabled = false,
  correctGradient,
  onClick,
}) => {
  const handleClick = () => {
    if (!disabled && state === 'default' && onClick) {
      onClick(id);
    }
  };

  // 根据 state 计算精确样式（匹配 QuizHall.tsx line 253-264）
  const getStyle = (): { bg: string; textColor: string; borderColor: string } => {
    if (state === 'selected' && correctGradient) {
      return { bg: correctGradient, textColor: '#fff', borderColor: 'transparent' };
    }
    if (state === 'correct') {
      return { bg: 'linear-gradient(135deg, #34d399, #6ee7b7)', textColor: '#fff', borderColor: 'transparent' };
    }
    if (state === 'wrong') {
      return { bg: 'linear-gradient(135deg, #fb7185, #fda4af)', textColor: '#fff', borderColor: 'transparent' };
    }
    if (state === 'disabled') {
      return { bg: 'rgba(255,255,255,0.07)', textColor: '#9ca3af', borderColor: 'transparent' };
    }
    return { bg: 'rgba(255,255,255,0.1)', textColor: '#1e1b4b', borderColor: 'transparent' };
  };

  const { bg, textColor } = getStyle();

  return (
    <View
      className={`option-btn option-btn--${state}`}
      style={{
        background: bg,
        borderRadius: 16,
        padding: '16px 20px',
        transition: 'background 0.4s ease',
      }}
      onClick={handleClick}
    >
      <Text style={{
        fontSize: 16,
        fontWeight: 600,
        color: textColor,
        lineHeight: '1.5',
      }}>
        {text}
      </Text>
    </View>
  );
};

export default OptionButton;
