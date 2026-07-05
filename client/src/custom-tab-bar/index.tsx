import { Component } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

class CustomTabBar extends Component {
  state = {
    selected: 0,
  };

  componentDidMount() {
    // 根据当前页面路径确定选中 tab
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
    const tabs = [
      { label: '首页', icon: '🏠', path: 'pages/index/index' },
      { label: '对战', icon: '⚔️', path: 'pages/challenge/index' },
      { label: '我的', icon: '👤', path: 'pages/profile/index' },
    ];


    return (
      <View className='tab-bar'>
        <View className='tab-bar__inner'>
          {tabs.map((tab, index) => (
            <View
              key={tab.path}
              className={`tab-bar__item ${selected === index ? 'tab-bar__item--active' : ''}`}
              onClick={() => this.switchTab(index, tab.path)}
            >
              <Text className='tab-bar__icon'>{tab.icon}</Text>
              <Text className='tab-bar__label'>{tab.label}</Text>
              {selected === index && <View className='tab-bar__indicator' />}
            </View>
          ))}
        </View>
      </View>
    );
  }
}

export default CustomTabBar;
