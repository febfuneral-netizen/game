import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGame } from '../../store/gameContext';
import './index.scss';

const Settings: React.FC = () => {
  const { doLogout } = useGame();

  const handleClearCache = () => {
    Taro.showModal({
      title: '清除缓存',
      content: '将清除本地缓存的登录状态和数据，需要重新登录。确定继续？',
      success: (res) => {
        if (res.confirm) {
          Taro.clearStorageSync();
          doLogout();
          Taro.showToast({ title: '缓存已清除', icon: 'success' });
        }
      },
    });
  };

  const handleAbout = () => {
    Taro.showModal({
      title: '关于学科答题',
      content: '学科答题闯关小程序\n版本：1.0.0\n\n涵盖语文、数学、英语、科学、历史、地理六大学科，通过答题闯关获取积分，解锁更多章节，与好友比拼排名！',
      showCancel: false,
      confirmText: '知道了',
    });
  };

  const handleFeedback = () => {
    Taro.showToast({ title: '感谢反馈，功能开发中', icon: 'none' });
  };

  return (
    <View className='settings-page'>
      {/* 通用设置 */}
      <View className='settings-page__section'>
        <Text className='settings-page__section-title'>通用</Text>
        <View className='settings-page__group'>
          <View className='settings-page__item' onClick={handleClearCache}>
            <Text className='settings-page__item-icon'>🗑️</Text>
            <Text className='settings-page__item-text'>清除缓存</Text>
            <Text className='settings-page__item-arrow'>›</Text>
          </View>
        </View>
      </View>

      {/* 关于 */}
      <View className='settings-page__section'>
        <Text className='settings-page__section-title'>关于</Text>
        <View className='settings-page__group'>
          <View className='settings-page__item' onClick={handleAbout}>
            <Text className='settings-page__item-icon'>ℹ️</Text>
            <Text className='settings-page__item-text'>关于我们</Text>
            <Text className='settings-page__item-value'>v1.0.0</Text>
            <Text className='settings-page__item-arrow'>›</Text>
          </View>
          <View className='settings-page__item' onClick={handleFeedback}>
            <Text className='settings-page__item-icon'>💬</Text>
            <Text className='settings-page__item-text'>意见反馈</Text>
            <Text className='settings-page__item-arrow'>›</Text>
          </View>
        </View>
      </View>

      {/* 退出登录 */}
      <View className='settings-page__logout-wrap'>
        <View className='settings-page__logout-btn' onClick={doLogout}>
          <Text className='settings-page__logout-text'>退出登录</Text>
        </View>
      </View>
    </View>
  );
};

export default Settings;
