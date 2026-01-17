# Sidebets 项目部署指南

> 完整的生产环境部署文档 - Monad 黑客松项目

---

## 📋 目录

1. [架构概述](#架构概述)
2. [前置准备](#前置准备)
3. [智能合约部署](#智能合约部署)
4. [Relayer 服务部署](#relayer-服务部署)
5. [Next.js 前端部署](#nextjs-前端部署)
6. [Telegram Bot 部署](#telegram-bot-部署)
7. [部署验证](#部署验证)
8. [故障排查](#故障排查)
9. [安全性最佳实践](#安全性最佳实践)
10. [监控与告警](#监控与告警)
11. [成本估算与优化](#成本估算与优化)
12. [合约升级策略](#合约升级策略)
13. [CI/CD 集成](#cicd-集成)
14. [灾难恢复](#灾难恢复)
15. [常见问题解答](#常见问题解答)

---

## 架构概述

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                               │
├─────────────────────────────────────────────────────────────┤
│  Web 浏览器          │   Telegram App                        │
│  (Next.js 前端)      │   (Mini App + Bot)                    │
└──────────┬───────────┴──────────────┬────────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 网关层                              │
├─────────────────────────────────────────────────────────────┤
│  Relayer 服务       │   Telegram Bot (Webhook)              │
│  (签名收集 + 上链)   │   (通知 + 订阅管理)                    │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Monad Testnet                             │
│  SidebetFactory (合约)  │  MockToken (代币)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 前置准备

### 1. 账号注册清单

| 服务 | 用途 | 链接 |
|------|------|------|
| Privy | 社交登录 | https://dashboard.privy.io |
| Alchemy | RPC 节点 | https://www.alchemy.com/ |
| WalletConnect | 钱包连接 | https://cloud.walletconnect.com |
| Vercel | 前端托管 | https://vercel.com |
| Railway | 后端托管 | https://railway.app |
| Telegram Bot | Bot 服务 | @BotFather |

### 2. 获取 API Keys

```bash
# 1. Privy App ID
NEXT_PUBLIC_PRIVY_APP_ID=cmxxxx...

# 2. Alchemy API Key
ALCHEMY_API_KEY=xxxxxxxxxxxxx
NEXT_PUBLIC_ALCHEMY_API_KEY=xxxxxxxxxxxxx

# 3. WalletConnect Project ID
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=xxxxxxxxxxxxx

# 4. Telegram Bot Token
BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 3. 准备部署账户

```bash
# 生成部署账户私钥
cd packages/hardhat
yarn generate

# 保存输出的私钥，用于部署
```

---

## 智能合约部署

### 第一步：配置环境

```bash
cd packages/hardhat
cp .env.example .env
```

编辑 `.env`:

```bash
# 部署私钥
DEPLOYER_PRIVATE_KEY_ENCRYPTED=<从 yarn generate 获取>

# Monad Testnet RPC
MONAD_TESTNET_RPC=https://rpc.ankr.com/monad_testnet
```

### 第二步：获取测试币

```bash
# 查看部署账户地址
yarn hardhat run scripts/showAccount.ts --network monadTestnet

# 从 Faucet 获取测试币
# https://faucet.monad.xyz/
```

### 第三步：部署合约

```bash
# 部署到 Monad Testnet
yarn deploy --network monadTestnet
```

### 第四步：记录合约地址

部署成功后会输出：

```
✅ SidebetFactory deployed to: 0x1234...5678
✅ MockToken deployed to: 0xabcd...efgh
```

**保存这些地址，后续服务需要用到！**

---

## Relayer 服务部署

### 方案 A：Railway 部署（推荐）

#### 1. 准备部署

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login
```

#### 2. 初始化项目

```bash
cd relayer
railway init
```

#### 3. 配置环境变量

在 Railway Dashboard 设置：

```bash
PORT=3001
NODE_ENV=production

# 数据库 (使用 Railway Postgres)
DATABASE_URL=postgresql://...

# Monad RPC
RPC_URL=https://rpc.ankr.com/monad_testnet
CHAIN_ID=41454

# 合约地址
SIDEBET_FACTORY_ADDRESS=0x...  # 从部署获取
MOCK_TOKEN_ADDRESS=0x...       # 从部署获取

# Relayer 私钥 (生成独立账户)
RELAYER_PRIVATE_KEY=0x...
```

#### 4. 部署

```bash
railway up
railway deploy
```

### 方案 B：VPS 部署

#### 1. 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2
sudo npm install -g pm2
```

#### 2. 部署代码

```bash
# 克隆代码
git clone <your-repo> /var/www/sidebets
cd /var/www/sidebets/relayer

# 安装依赖
npm install

# 生成 Prisma 客户端
npm run prisma:generate

# 设置数据库
npm run prisma:migrate
```

#### 3. 配置环境

```bash
cp .env.example .env
nano .env
```

#### 4. 启动服务

```bash
# 使用 PM2 启动
pm2 start dist/index.js --name sidebets-relayer
pm2 save
pm2 startup
```

### 方案 C：Docker 部署

创建 `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build
RUN npm run prisma:generate

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

部署命令：

```bash
docker build -t sidebets-relayer .
docker run -d \
  --name relayer \
  --env-file .env \
  -p 3001:3001 \
  sidebets-relayer
```

---

## Next.js 前端部署

### Vercel 部署（推荐）

#### 1. 连接 GitHub

1. 访问 https://vercel.com
2. 导入 GitHub 仓库
3. 选择 `packages/nextjs` 作为根目录

#### 2. 配置环境变量

在 Vercel Dashboard 设置：

```bash
# Privy
NEXT_PUBLIC_PRIVY_APP_ID=cmxxxx...

# RPC
NEXT_PUBLIC_ALCHEMY_API_KEY=xxxxxxxxxxxxx

# WalletConnect
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=xxxxxxxxxxxxx

# 合约地址
NEXT_PUBLIC_FACTORY_ADDRESS=0x...  # 从部署获取
NEXT_PUBLIC_TOKEN_ADDRESS=0x...     # 从部署获取

# 网络
NEXT_PUBLIC_TARGET_NETWORKS=monadTestnet
NEXT_PUBLIC_CHAIN_ID=41454
```

#### 3. 配置构建设置

```bash
# Build Command
cd packages/nextjs && npm run build

# Output Directory
packages/nextjs/.next

# Install Command
npm install
```

#### 4. 部署

点击 "Deploy" 开始部署。

部署成功后，记录域名：`https://your-app.vercel.app`

### 更新 scaffold.config.ts

确保 `packages/nextjs/scaffold.config.ts` 包含：

```typescript
export const scaffoldConfig = {
  targetNetworks: [
    {
      id: 41454, // Monad Testnet
      name: "Monad Testnet",
      nativeCurrency: {
        name: "MON",
        symbol: "MON",
        decimals: 18,
      },
      rpcUrls: ["https://rpc.ankr.com/monad_testnet"],
      blockExplorers: [
        {
          name: "Monad Explorer",
          url: "https://explorer.testnet.monad.xyz",
        },
      ],
    },
  ],
  // ...
};
```

---

## Telegram Bot 部署

### 第一步：创建 Bot

1. 在 Telegram 中找到 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot`
3. 按提示设置 bot 名称和用户名
4. 保存返回的 **Bot Token**

### 第二步：设置 Bot 命令

向 @BotFather 发送：

```
/setcommands

start - Start using the bot
markets - Browse all markets
subscriptions - Manage your subscriptions
settings - Configure your settings
help - Show help message
about - About Sidebets
```

### 第三步：配置 Bot

创建 `telegram-bot/.env`:

```bash
BOT_TOKEN=<从 BotFather 获取>

# Relayer API (使用 Railway 部署的 URL)
RELAYER_API_URL=https://your-relayer.railway.app

# Mini App URL (使用 Vercel 部署的 URL)
MINI_APP_URL=https://your-app.vercel.app/tg
WEBAPP_URL=https://your-app.vercel.app

NODE_ENV=production

# 数据库 (SQLite 生产环境使用 Postgres)
DATABASE_URL=postgresql://...
```

### 第四步：部署到 Railway

```bash
cd telegram-bot

# 初始化 Railway 项目
railway init

# 上传代码
railway up

# 设置环境变量
railway variables set BOT_TOKEN="..."
railway variables set RELAYER_API_URL="..."
railway variables set MINI_APP_URL="..."

# 部署
railway deploy
```

### 第五步：设置 Webhook（生产环境）

```bash
# 替换 YOUR_RAILWAY_URL 为你的 Railway URL
curl -F "url=https://YOUR_RAILWAY_URL/webhook" \
  -F "drop_pending_updates=true" \
  https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

### 第六步：配置 Mini App

在 BotFather 设置 Mini App：

```
/newapp
```

按提示设置：
- App URL: `https://your-app.vercel.app/tg`
- 选择显示类型（全屏）

---

## 部署验证

### 1. 检查合约状态

访问 [Monad Explorer](https://explorer.testnet.monad.xyz)

```
https://explorer.testnet.monad.xyz/address/<FACTORY_ADDRESS>
```

### 2. 检查 Relayer

```bash
curl https://your-relayer.railway.app/health
```

预期返回：

```json
{
  "status": "ok",
  "timestamp": "2025-01-17T...",
  "services": {
    "database": "connected",
    "blockchain": "connected"
  }
}
```

### 3. 检查前端

访问：`https://your-app.vercel.app`

检查：
- [ ] 页面正常加载
- [ ] 钱包可以连接
- [ ] 可以切换到 Monad Testnet
- [ ] 市场列表正常显示

### 4. 检查 Telegram Bot

在 Telegram 中搜索你的 Bot，发送 `/start`

检查：
- [ ] Bot 正确响应
- [ ] 按钮可点击
- [ ] Mini App 可以打开

### 5. 端到端测试

1. 创建一个市场
2. 下注 (Stake)
3. 提交结果 (Propose)
4. 证明 (Attest)
5. 验证最终化 (Finalize)

---

## 故障排查

### Relayer 相关

| 问题 | 解决方案 |
|------|----------|
| 无法连接 RPC | 检查 `RPC_URL`，尝试使用备用 RPC |
| 数据库错误 | 运行 `npm run prisma:migrate` |
| 合约调用失败 | 检查合约地址是否正确 |

### 前端相关

| 问题 | 解决方案 |
|------|----------|
| 钱包无法连接 | 检查 `NEXT_PUBLIC_PRIVY_APP_ID` |
| 合约交互失败 | 检查用户是否在正确的网络 |
| 数据无法加载 | 检查 Relayer API 是否可访问 |

### Telegram Bot 相关

| 问题 | 解决方案 |
|------|----------|
| Bot 无响应 | 检查 `BOT_TOKEN` 是否正确 |
| Webhook 失败 | 删除并重新设置 webhook |
| Mini App 无法打开 | 检查 `MINI_APP_URL` 是否正确 |

---

## 部署检查清单

### 智能合约
- [ ] 部署账户有足够余额
- [ ] 合约部署成功
- [ ] 记录合约地址
- [ ] 在 Explorer 验证

### Relayer
- [ ] 环境变量配置完整
- [ ] 数据库迁移成功
- [ ] 服务正常启动
- [ ] API 响应正常

### 前端
- [ ] Vercel 部署成功
- [ ] 环境变量配置完整
- [ ] 合约地址正确
- [ ] Privy 配置正确

### Telegram Bot
- [ ] Bot Token 获取
- [ ] 命令设置完成
- [ ] Webhook 配置
- [ ] Mini App URL 配置

---

## 部署后 URL 示例

| 服务 | URL 示例 |
|------|----------|
| 前端 | https://sidebets.vercel.app |
| Mini App | https://sidebets.vercel.app/tg |
| Relayer API | https://sidebets-relayer.up.railway.app |
| Explorer | https://explorer.testnet.monad.xyz/address/0x... |

---

## 日常维护

### 更新部署

```bash
# 前端
git push origin main  # Vercel 自动部署

# Relayer
cd relayer
railway up
railway deploy

# Telegram Bot
cd telegram-bot
railway up
railway deploy
```

### 监控

```bash
# Relayer 日志
railway logs

# 检查健康状态
curl https://your-relayer.railway.app/health/detailed
```

### 备份

- 定期导出数据库
- 保存部署私钥到安全位置
- 记录所有合约地址

---

## 有用链接

| 资源 | 链接 |
|------|------|
| Monad 文档 | https://docs.monad.xyz/ |
| Privy 文档 | https://docs.privy.io/ |
| Vercel 文档 | https://vercel.com/docs |
| Railway 文档 | https://docs.railway.app/ |
| Telegram Bot API | https://core.telegram.org/bots/api |

---

文档版本: 1.0
更新时间: 2025-01-17
