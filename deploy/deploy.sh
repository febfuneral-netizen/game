#!/bin/bash
# 学科答题闯关游戏 - 一键部署脚本
# 使用方式: bash deploy.sh
# 前置条件: 已配置 SSH 密钥登录

set -e

# ===== 配置 =====
SERVER_IP="47.108.61.209"
SSH_KEY="C:/Users/febfu/Downloads/codebuddy.pem"
REMOTE_DIR="/data/quiz-miniapp"
REMOTE_USER="root"

# ===== 颜色输出 =====
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  学科答题闯关 - 一键部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查依赖
command -v npm >/dev/null 2>&1 || { echo -e "${RED}请先安装 Node.js${NC}"; exit 1; }
command -v ssh >/dev/null 2>&1 || { echo -e "${RED}请先安装 SSH${NC}"; exit 1; }

# ===== Step 1: 构建后端 =====
echo -e "\n${YELLOW}[1/5] 构建后端...${NC}"
cd "$(dirname "$0")/../server"
npm install
npm run build
echo -e "${GREEN}✓ 后端构建完成${NC}"

# ===== Step 2: 打包代码 =====
echo -e "\n${YELLOW}[2/5] 打包代码...${NC}"
cd "$(dirname "$0")/.."
tar -czf /tmp/quiz-miniapp.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  server/ deploy/ package.json
echo -e "${GREEN}✓ 打包完成${NC}"

# ===== Step 3: 传输到服务器 =====
echo -e "\n${YELLOW}[3/5] 传输到服务器...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "mkdir -p $REMOTE_DIR"
scp -i "$SSH_KEY" /tmp/quiz-miniapp.tar.gz "$REMOTE_USER@$SERVER_IP:$REMOTE_DIR/"
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" "cd $REMOTE_DIR && tar -xzf quiz-miniapp.tar.gz && rm quiz-miniapp.tar.gz"
echo -e "${GREEN}✓ 传输完成${NC}"

# ===== Step 4: 远程部署 =====
echo -e "\n${YELLOW}[4/5] 远程部署...${NC}"
ssh -i "$SSH_KEY" "$REMOTE_USER@$SERVER_IP" << 'REMOTE'
  set -e

  # 安装依赖
  cd /data/quiz-miniapp/server
  npm install --production

  # 检查 MongoDB
  if command -v mongosh &> /dev/null; then
    echo "MongoDB 已安装"
  else
    echo "请安装 MongoDB 7.x"
  fi

  # 检查 PM2
  if command -v pm2 &> /dev/null; then
    echo "PM2 已安装"
  else
    npm install -g pm2
  fi

  # 导入初始题库
  npm run seed

  # 启动服务
  pm2 start /data/quiz-miniapp/deploy/ecosystem.config.js
  pm2 save

  # 检查 Nginx 配置
  if [ -f /etc/nginx/conf.d/quiz-miniapp.conf ]; then
    echo "Nginx 配置已存在"
  else
    echo "请手动部署 Nginx 配置:"
    echo "  cp /data/quiz-miniapp/deploy/nginx.conf /etc/nginx/conf.d/quiz-miniapp.conf"
    echo "  nginx -t && nginx -s reload"
  fi

  echo -e "\n${GREEN}✓ 部署完成！${NC}"
  echo -e "    API: https://game.chaogetalks.com"
  echo -e "    健康检查: https://game.chaogetalks.com/health"
REMOTE

# ===== Step 5: 清理 =====
echo -e "\n${YELLOW}[5/5] 清理...${NC}"
rm -f /tmp/quiz-miniapp.tar.gz
echo -e "${GREEN}✓ 清理完成${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  部署成功！${NC}"
echo -e "${GREEN}  服务器: https://game.chaogetalks.com${NC}"
echo -e "${GREEN}========================================${NC}"
