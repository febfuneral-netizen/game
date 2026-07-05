module.exports = function (merge) {
  return {
    projectName: 'quiz-miniapp',
    date: '2026-7-4',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: ['@tarojs/plugin-platform-weapp', '@tarojs/plugin-framework-react'],
    defineConstants: {
      __BASE_URL__: '"https://game.chaogetalks.com"',
    },
    copy: {
      patterns: [],
      options: {},
    },
    framework: 'react',
    compiler: 'webpack5',
    mini: {
      swc: false,
      enableEngineNative: false,
      postcss: {
        pxtransform: {
          enable: true,
          config: {},
        },
        url: {
          enable: true,
          config: {
            limit: 10240,
          },
        },
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      postcss: {
        pxtransform: {
          enable: false,
          config: {},
        },
      },
    },
  };
};
