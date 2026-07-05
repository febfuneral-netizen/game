export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/challenge/index',
    'pages/profile/index',
    'pages/quiz/index',
    'pages/subject-prep/index',
    'pages/result/index',
    'pages/leaders/index',
    'pages/shop/index',
    'pages/backpack/index',
    'pages/activity/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#F8F9FC',
    navigationBarTitleText: '学科答题',
    navigationBarTextStyle: 'black',
    backgroundColor: '#F8F9FC',
  },
  tabBar: {
    custom: true,
    color: '#9CA3AF',
    selectedColor: '#7C5CFF',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
      },
      {
        pagePath: 'pages/challenge/index',
        text: '对战',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
      },
    ],
  },
  style: 'v2',
});
