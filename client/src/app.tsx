import React from 'react';
import { View } from '@tarojs/components';
import { GameProvider } from './store/gameContext';
import './app.scss';

function App(props: any) {
  return (
    <GameProvider>
      <View>{props.children}</View>
    </GameProvider>
  );
}

export default App;
