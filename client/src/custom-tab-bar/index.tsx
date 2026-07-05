import { Component } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

// Tab 图标配置：每个 tab 使用渐变圆形 + emoji 风格，与首页学科卡片图标统一
const TAB_CONFIG = [
  {
    label: '首页',
    icon: '🏠',
    color: '#FF6B6B',
    colorEnd: '#FF8E53',
    path: 'pages/index/index',
  },
  {
    label: '对战',
    icon: '⚔️',
    color: '#6366F1',
    colorEnd: '#A855F7',
    path: 'pages/challenge/index',
  },
  {
    label: '我的',
    icon: '👤',
    color: '#10B981',
    colorEnd: '#06B6D4',
    path: 'pages/profile/index',
  },
];

class CustomTabBar extends Component {
  state = {
    selected: 0,
  };

  componentDidMount() {
    const pages = Taro.getCurrentPages();
    if (pages.length > 0) {
      const route = pages[pages.length - 1].route || '';
      if (route.includes('challenge')) {
        this.setState({ selected: 1 });
      } else if (route.includes('profile')) {
        this.setState({ selected: 2 });
      } else {
        this.setState({ selected: 0 });
      }
    }
  }

  switchTab(index: number, path: string) {
    this.setState({ selected: index });
    Taro.switchTab({ url: `/${path}` });
  }

  render() {
    const { selected } = this.state;

    return (
      <View className='tab-bar'>
        <View className='tab-bar__inner'>
          {TAB_CONFIG.map((tab, index) => {
            const active = selected === index;
            return (
              <View
                key={tab.path}
                className={`tab-bar__item ${active ? 'tab-bar__item--active' : ''}`}
                onClick={() => this.switchTab(index, tab.path)}
              >
                {/* 渐变圆形图标容器 — 与学科卡片 icon-bg 风格一致 */}
                <View
                  className={`tab-bar__icon-bg ${active ? 'tab-bar__icon-bg--active' : ''}`}
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${tab.color}, ${tab.colorEnd})`
                      : '#F3F4F6',
                  }}
                >
                  <Text className='tab-bar__icon-emoji'>{tab.icon}</Text>
                </View>
                <Text className={`tab-bar__label ${active ? 'tab-bar__label--active' : ''}`}>
                  {tab.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }
}

export default CustomTabBar;
