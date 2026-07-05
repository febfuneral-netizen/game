# 学科答题闯关游戏 - 游戏设计文档 (GDD)

**版本**: 1.0 | **日期**: 2026-07-04

## 1. 游戏概述

- **名称**: 学科答题闯关
- **类型**: 知识问答 / 闯关
- **平台**: 微信小程序
- **目标用户**: 中小学生(8-16岁)
- **核心玩法**: 选择学科 → 10题闯关(答错即止) → 结算

## 2. 核心循环

```
选择学科 → 预备(3-2-1) → 答题(10s) → 揭晓(3s) → 下一题/结算
```

## 3. 游戏机制

### 3.1 闯关规则
- 每局10题，难度递进(简单→中等→困难)
- 每题10秒倒计时，超时视为答错
- **答错即止**: 中途答错立即淘汰
- 10题全对 → 通关

### 3.2 计分规则
- 正确基础分: 100分
- 速度奖励: max(0, 10 - 用时秒) × 10
- 答错: 0分

### 3.3 学科进度
- 6大学科: 语文、数学、英语、科学、历史、地理
- 状态: locked(未解锁) / newbie(未开始) / ongoing(进行中) / cleared(已通关)
- Phase 1 全部学科默认解锁

## 4. 美术规范

### 4.1 色彩
- 首页背景: #F8F9FC
- 主色: #7C5CFF
- 正确: #22C55E
- 错误: #EF4444
- 警告: #F59E0B
- 每种学科独立渐变色

### 4.2 字体
- PingFang SC (小程序内置)
- H1: 48px/700, H2: 28px/600, H3: 20px/500

### 4.3 动效
- 倒计时: scale脉冲
- 选项: 紫色边框扩散
- 揭晓: 正确发光/错误抖动
- 彩带: CSS飘落

## 5. 技术栈

- 前端: Taro 3.x (React) + SCSS + Canvas 2D
- 后端: Express + MongoDB + JWT
- 部署: Nginx + PM2 (阿里云 ECS)
- Phase 2: Socket.IO + Redis (1v1对战)

## 6. API 设计

详见 `FINAL_DEV_PLAN.md` 第7节，共5个核心API:
- POST /api/user/login
- GET /api/user/profile
- POST /api/game/start
- POST /api/game/submit
- GET /api/game/result/:gameId
- POST/DELETE /api/questions (题库管理)

## 7. 复用代码

- **WxSocketIO**: weapp-demo-websocket 项目的微信Socket.IO适配客户端
- **room.ts**: 房间管理和匹配逻辑(Phase 2)
- **game.ts**: 对战判定逻辑(Phase 2)
- 所有复用代码存放在 `client/src/vendor/` 和 `server/src/vendor/`
