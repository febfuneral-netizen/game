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
  correctGradient,
  onClick,
}) => {
  const handleClick = () => {
    if (state === 'default' && onClick) {
      onClick(id);
    }
  };

  const getStyle = () => {
    if (state === 'selected' && correctGradient) {
      return { bg: correctGradient, textColor: '#fff' };
    }
    if (state === 'correct') {
      return { bg: 'linear-gradient(135deg, #34d399, #6ee7b7)', textColor: '#fff' };
    }
    if (state === 'wrong') {
      return { bg: 'linear-gradient(135deg, #fb7185, #fda4af)', textColor: '#fff' };
    }
    return { bg: 'transparent', textColor: '#1e1b4b' };
  };

  const { bg, textColor } = getStyle();

  return (
    <View
      className={`option-btn option-btn--${state}`}
      style={{ background: bg }}
      onClick={handleClick}
    >
      <Text className='option-btn__text' style={{ color: textColor }}>
        {text}
      </Text>
    </View>
  );
};

export default OptionButton;

