# Sidebets 开发清单

> 项目当前完成度概览与待办事项

---

## 📊 整体进度

| 模块 | 完成度 | 状态 |
|------|--------|------|
| 智能合约层 | 100% | ✅ |
| 合约测试 | 100% | ✅ |
| Hardhat 配置 | 100% | ✅ |
| 前端 UI | 100% | ✅ |
| EIP-712 签名 | 100% | ✅ |
| API 路由 | 100% | ✅ |
| Privy 集成 | 100% | ✅ |
| Relayer 后端 | 100% | ✅ |
| Telegram 集成 | 0% | ❌ |
| Monad 部署 | 0% | ❌ |

---

## ✅ 已完成部分

### 1. 智能合约层 (100%)

- [x] `Sidebet.sol` - 核心市场合约
  - [x] 状态管理 (Open/Proposed/Resolved/Cancelled/Disputed)
  - [x] EIP-712 签名验证
  - [x] 共识结算机制
  - [x] 争议机制 (2小时窗口)
  - [x] 资金托管与分配
  - [x] 取消功能

- [x] `SidebetFactory.sol` - 工厂合约
  - [x] CREATE2 部署
  - [x] 地址预测
  - [x] 市场索引管理
  - [x] 按创建者查询

- [x] `MockToken.sol` - 测试代币
- [x] `ISidebet.sol` - 接口定义

### 2. 测试套件 (100%)

- [x] 38 个测试全部通过
- [x] SidebetFactory 测试 (4个)
- [x] 市场创建测试 (4个)
- [x] 投注测试 (5个)
- [x] 提案测试 (3个)
- [x] 共识结算测试 (7个)
- [x] 争议测试 (3个)
- [x] 取消测试 (4个)
- [x] 进度追踪测试 (2个)
- [x] MockToken 测试 (4个)

### 3. 开发环境 (100%)

- [x] Hardhat 配置
- [x] Monad Testnet RPC 配置
- [x] TypeScript 类型生成
- [x] 部署脚本
- [x] Scaffold-ETH 2 框架搭建
- [x] 私钥加密配置系统

### 4. 前端开发 (100%)

#### 4.1 类型定义 ✅
- [x] `types/sidebet.ts` - 完整类型定义

#### 4.2 合约交互 Hooks ✅
- [x] `hooks/useSidebetFactory.ts` - 工厂合约交互
- [x] `hooks/useSidebet.ts` - 市场合约交互
- [x] `hooks/useAttestation.ts` - EIP-712 签名 Hook

#### 4.3 UI 组件 ✅
- [x] `components/sidebet/MarketCard.tsx` - 市场卡片
- [x] `components/sidebet/ProgressBar.tsx` - 进度条
- [x] `components/sidebet/StakeModal.tsx` - 投注弹窗
- [x] `components/sidebet/ProposeModal.tsx` - 提案弹窗
- [x] `components/sidebet/AttestationModal.tsx` - 签名弹窗
- [x] `components/sidebet/AttestationList.tsx` - 签名列表
- [x] `components/sidebet/LoginModal.tsx` - 社交登录弹窗

#### 4.4 页面 ✅
- [x] `app/page.tsx` - 主页
- [x] `app/markets/page.tsx` - 市场列表
- [x] `app/create/page.tsx` - 创建市场
- [x] `app/market/[address]/page.tsx` - 市场详情 (含签名功能)

#### 4.5 API 路由 ✅
- [x] `app/api/attestations/route.ts` - 签名提交 API

### 5. EIP-712 签名认证 (100%) ✅

#### 5.1 签名 Hook ✅
- [x] `hooks/useAttestation.ts`
  - [x] EIP-712 域构建
  - [x] 类型化数据签名
  - [x] 签名预览功能
  - [x] 错误处理

#### 5.2 签名 UI ✅
- [x] `AttestationModal.tsx` - 签名弹窗
  - [x] 签名内容预览
  - [x] 确认复选框
  - [x] 警告提示
- [x] `AttestationList.tsx` - 签名列表
  - [x] 进度统计
  - [x] 参与者签名状态
  - [x] 阈值显示

### 6. Privy 钱包集成 (100%) ✅

#### 6.1 基础集成 ✅
- [x] 安装 `@privy-io/react-auth` SDK
- [x] 配置 Privy App ID
- [x] 实现 PrivyProvider
- [x] 登录/注册 UI (LoginModal)

#### 6.2 嵌入式钱包 ✅
- [x] 钱包创建流程
- [x] 钱包余额显示
- [x] 代币授权支持

#### 6.3 签名功能 ✅
- [x] Privy `signTypedData` 集成
- [x] EIP-712 域配置
- [x] 签名错误处理
- [x] 双钱包支持 (Privy + Wagmi)

#### 6.4 社交登录 ✅
- [x] Email 登录
- [x] Google 登录
- [x] Twitter 登录
- [x] Discord 登录
- [x] Telegram 登录
- [x] Farcaster 登录
- [x] 外部钱包连接
- [x] 登录源徽章显示

#### 6.5 组件更新 ✅
- [x] `privy/PrivyProvider.tsx` - Provider 配置
- [x] `hooks/usePrivy.ts` - Privy Hook 封装
- [x] `components/sidebet/LoginModal.tsx` - 社交登录弹窗
- [x] `app/layout.tsx` - 添加 PrivyProvider
- [x] `RainbowKitCustomConnectButton` - 支持 Privy 登录
- [x] `AddressInfoDropdown` - 支持 Privy 登出
- [x] `hooks/useAttestation.ts` - 支持 Privy + Wagmi 双签名
- [x] `.env.example` - 添加 NEXT_PUBLIC_PRIVY_APP_ID

### 7. Relayer 后端服务 (100%) ✅

#### 7.1 基础架构 ✅
- [x] Node.js + Express 项目搭建
- [x] TypeScript 配置
- [x] 环境变量配置 (Zod 验证)
- [x] Winston 日志系统
- [x] 错误处理中间件
- [x] Helmet 安全头
- [x] CORS 配置
- [x] 速率限制

#### 7.2 数据库 ✅
- [x] Prisma ORM 配置
- [x] SQLite schema 设计
- [x] User 表 - 用户账户
- [x] Market 表 - 市场缓存
- [x] Participant 表 - 参与者
- [x] Proposal 表 - 提案
- [x] Attestation 表 - 签名记录
- [x] Dispute 表 - 争议
- [x] SyncLog 表 - 同步日志
- [x] FinalizationQueue 表 - 结算队列

#### 7.3 API 接口 ✅
- [x] `GET /health` - 健康检查
- [x] `GET /health/detailed` - 详细状态
- [x] `GET /health/queue` - 结算队列
- [x] `GET /api/markets` - 市场列表
- [x] `GET /api/markets/:address` - 市场详情
- [x] `POST /api/markets/:address/sync` - 同步市场
- [x] `GET /api/markets/:address/participants` - 参与者
- [x] `GET /api/markets/:address/proposal` - 活跃提案
- [x] `POST /api/markets/predict-address` - CREATE2 预测
- [x] `GET /api/markets/:address/status` - 链上状态
- [x] `POST /api/attestations` - 提交签名
- [x] `GET /api/attestations` - 获取签名
- [x] `GET /api/attestations/:market/count` - 签名统计

#### 7.4 服务层 ✅
- [x] `services/blockchain.ts` - 区块链交互
  - [x] 市场/提案/参与者查询
  - [x] 市场结算交易
  - [x] 争议提交
  - [x] EIP-712 签名验证
  - [x] 事件监听
- [x] `services/signature.ts` - 签名收集
  - [x] 签名提交与验证
  - [x] 市场同步
  - [x] 阈值检查
- [x] `services/finalization.ts` - 自动结算
  - [x] 阈值检查
  - [x] 结算处理
  - [x] 争议窗口监控
  - [x] 旧提案处理

#### 7.5 后台任务 ✅
- [x] 定时市场同步 (5分钟)
- [x] 争议窗口检查 (2分钟)
- [x] 自动结算处理 (1分钟)
- [x] 旧提案检查 (1小时)
- [x] 日志清理 (每日)

#### 7.6 文件结构 ✅
```
relayer/
├── prisma/schema.prisma        # 数据库 schema
├── src/
│   ├── config/index.ts         # 配置管理
│   ├── models/database.ts      # Prisma 包装器
│   ├── routes/
│   │   ├── attestations.ts     # 签名路由
│   │   ├── markets.ts          # 市场路由
│   │   └── health.ts           # 健康检查路由
│   ├── services/
│   │   ├── blockchain.ts       # 区块链服务
│   │   ├── signature.ts        # 签名服务
│   │   └── finalization.ts     # 结算服务
│   ├── utils/
│   │   ├── logger.ts           # 日志工具
│   │   ├── errors.ts           # 错误类
│   │   └── validation.ts       # 验证 schema
│   └── index.ts                # 服务入口
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### 8. 文档 (95%)

- [x] README.md - 项目说明
- [x] PRIVATE_KEY_SETUP.md - 私钥配置指南
- [x] TODO.md - 开发清单
- [x] relayer/README.md - Relayer 文档
- [x] MONAD_DEPLOYMENT.md - Monad 部署指南
- [ ] API 文档
- [ ] 部署文档

---

## 🚧 待开发部分

### 1. Telegram 集成 (优先级: 🔥 高)

#### 架构方案：Bot + Mini App 组合

```
┌─────────────────────────────────────────────────────────────┐
│                      Telegram Bot                            │
│  • 欢迎消息 /start                                           │
│  • 市场列表推送                                              │
│  • 快捷操作按钮                                              │
│  • 通知推送                                                  │
│                        │ 点击按钮                             │
│                        ▼                                     │
│              ┌─────────────────────┐                        │
│              │  Telegram Mini App  │                        │
│              │  (复用现有前端)      │                        │
│              │  - 完整市场列表      │                        │
│              │  - 投注/创建市场     │                        │
│              │  - 签名认证          │                        │
│              └─────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

#### 1.1 Telegram Bot (grammY)

**基础设置**
- [ ] 安装 grammY 框架
- [ ] Bot Token 配置 (@BotFather)
- [ ] Webhook 设置 (生产) / Polling (开发)
- [ ] 环境变量配置

**命令系统**
- [ ] `/start` - 欢迎消息 + 主菜单
- [ ] `/help` - 帮助说明
- [ ] `/markets` - 市场列表 (内联按钮)
- [ ] `/create` - 引导创建市场
- [ ] `/mybets` - 查看个人仓位
- [ ] `/notifications` - 通知设置

**交互功能**
- [ ] 内联键盘 - 市场快捷操作
- [ ] 回调查询 - 按钮响应处理
- [ ] 消息推送 - 市场状态更新通知
- [ ] 用户状态管理 - 关联 Telegram ID 到钱包

#### 1.2 Telegram Mini App

**Web App 集成**
- [ ] 安装 `@telegram-apps/sdk-react`
- [ ] 创建 Mini App 入口页面
- [ ] Telegram WebApp 样式适配
- [ ] 移动端响应式优化

**功能页面**
- [ ] `/tg` - Mini App 主页 (复用 /markets)
- [ ] `/tg/market/[id]` - 市场详情 (复用 /market/[id])
- [ ] `/tg/create` - 创建市场 (复用 /create)
- [ ] 钱包连接 (Telegram 内嵌浏览器支持)

**SDK 集成**
- [ ] `useWebApp` Hook
- [ ] `useExpand` Hook - 展开全屏
- [ ] `useBackButton` Hook - 返回按钮
- [ ] `useHapticFeedback` Hook - 触觉反馈
- [ ] `usePopup` Hook - 确认弹窗
- [ ] `showAlert` / `showConfirm` 方法

#### 1.3 Bot 与 Mini App 通信

**数据传递**
- [ ] WebAppInitData - 用户信息获取
- [ ] StartParam - 深度链接参数
- [ ] Mini App URL 生成 (带参数)

**通知系统**
- [ ] 市场创建通知
- [ ] 投注成功通知
- [ ] 提案提交通知
- [ ] 市场结算通知
- [ ] 争议触发通知

#### 1.4 数据库扩展

**新增表/字段**
- [ ] `User.telegramId` - Telegram 用户 ID
- [ ] `User.telegramUsername` - Telegram 用户名
- [ ] `User.notificationEnabled` - 通知开关
- [ ] `Subscription` - 市场订阅表

#### 1.5 文件结构
```
telegram-bot/
├── src/
│   ├── bot.ts                 # Bot 实例
│   ├── config/
│   │   └── index.ts           # Bot 配置
│   ├── handlers/
│   │   ├── start.ts          # /start 命令
│   │   ├── markets.ts        # /markets 命令
│   │   ├── create.ts         # /create 命令
│   │   └── notifications.ts  # 通知处理
│   ├── middlewares/
│   │   └── auth.ts           # 用户认证中间件
│   ├── keyboards/
│   │   └── index.ts          # 内联键盘定义
│   ├── services/
│   │   ├── user.ts           # 用户服务
│   │   ├── market.ts         # 市场服务 (调用 Relayer API)
│   │   └── notification.ts   # 通知服务
│   └── utils/
│       └── logger.ts         # 日志工具
├── package.json
├── tsconfig.json
├── .env.example
└── README.md

packages/nextjs/
├── app/
│   └── tg/                   # Mini App 页面
│       ├── page.tsx          # 主页 (市场列表)
│       ├── market/
│       │   └── [address]/page.tsx  # 市场详情
│       └── create/
│           └── page.tsx      # 创建市场
├── hooks/
│   └── useTelegramWebApp.ts  # WebApp SDK Hook
└── telegram/
    └── TelegramWebAppProvider.tsx  # Provider 包装器
```

---

### 2. Monad 网络部署 (优先级: 🔥 高)

#### 2.1 部署准备
- [x] Monad Testnet RPC 配置
- [ ] 获取测试币 (Faucet)
- [ ] 配置部署私钥

#### 2.2 合约部署
- [ ] 部署 MockToken
- [ ] 部署 SidebetFactory
- [ ] 验证部署结果

#### 2.3 部署后配置
- [ ] 更新前端 deployedContracts.ts
- [ ] 配置 scaffold.config.ts 网络
- [ ] 更新 Relayer .env
- [ ] 更新前端 .env.local

#### 2.4 验证测试
- [ ] 创建测试市场
- [ ] 完整投注流程测试
- [ ] 签名认证测试
- [ ] 自动结算测试

---

### 3. Farcaster Frame (优先级: 🟡 中)

- [ ] Frame 元数据配置
- [ ] 初始图片设计
- [ ] 按钮配置
- [ ] 创建市场按钮
- [ ] 投注按钮 (是/否)

---

### 4. 增强功能 (优先级: 🟡 中)

- [ ] 争议仲裁系统
- [ ] 用户信用分
- [ ] 多资产支持 (WETH/WBTC)
- [ ] NFT 徽章

---

### 5. 测试与部署 (优先级: 🔥 高)

- [ ] 前端 E2E 测试 (Playwright)
- [ ] 智能合约审计
- [ ] Vercel 部署配置
- [ ] 服务器配置 (Relayer + Bot)
- [ ] 监控告警设置

---

## 🎯 MVP 最小可行产品清单

### Phase 1 - 核心功能 ✅ 已完成

- [x] 前端市场列表页
- [x] 前端创建市场页
- [x] 前端市场详情页
- [x] 投注弹窗 (StakeModal)
- [x] 提案弹窗 (ProposeModal)
- [x] 进度条组件
- [x] 合约交互 Hooks
- [x] **EIP-712 签名认证** ✨
- [x] **签名收集 UI** ✨

### Phase 2 - 必需功能 ✅ 已完成

- [x] **Privy 钱包集成** ✨
- [x] **Relayer 后端基础 API** ✨
- [ ] Monad Testnet 部署

### Phase 3 - 用户体验 🚧 进行中

- [ ] **Telegram Bot + Mini App** ⏳
- [ ] 实时进度更新
- [ ] 通知系统
- [ ] 错误处理优化

### Phase 4 - 增强功能 ⏳ 待开始

- [ ] Farcaster Frame
- [ ] 争议仲裁机制
- [ ] 用户信用分
- [ ] 多资产支持

---

## 📝 快速参考

### 开发命令

```bash
# 启动本地网络
yarn chain

# 部署合约
yarn deploy

# 运行测试
yarn hardhat:test

# 启动前端
yarn start

# 启动 Relayer
cd relayer
npm install && npx prisma generate && npx prisma migrate dev
npm run dev

# 启动 Telegram Bot (待开发)
cd telegram-bot
npm install
npm run dev
```

### Telegram Bot 配置

1. 与 @BotFather 对话创建 Bot
2. 获取 Bot Token
3. 设置 Webhook (生产) 或使用 Polling (开发)
4. 配置 `.env`:
```bash
BOT_TOKEN=your-bot-token-here
RELAYER_API_URL=http://localhost:3001
MINI_APP_URL=https://your-app.vercel.app/tg
```

### Privy 配置

1. 访问 https://dashboard.privy.io 创建应用
2. 复制 App ID 到 `.env.local`:
```bash
NEXT_PUBLIC_PRIVY_APP_ID=your-app-id-here
```
3. 启动开发服务器即可使用社交登录

### Monad 部署命令

```bash
# 1. 验证连接
yarn hardhat run scripts/verifyConnection.ts --network monadTestnet

# 2. 部署合约
yarn deploy --network monadTestnet

# 3. 验证部署
yarn hardhat run scripts/verifyDeployment.ts --network monadTestnet

# 4. 创建测试市场
yarn hardhat run scripts/createTestMarket.ts --network monadTestnet
```

### 重要文件路径

```
packages/hardhat/
├── contracts/
│   ├── Sidebet.sol          # 核心合约
│   ├── SidebetFactory.sol   # 工厂合约
│   └── interfaces/
│       └── ISidebet.sol     # 接口定义
├── deploy/
│   └── 01_deploy_sidebet_factory.ts
├── scripts/
│   ├── verifyConnection.ts  # ✨ 新增
│   ├── verifyDeployment.ts  # ✨ 新增
│   └── createTestMarket.ts  # ✨ 新增
└── test/
    └── Sidebet.test.ts      # 测试文件 (38个测试)

packages/nextjs/
├── app/
│   ├── page.tsx             # 主页 ✨
│   ├── markets/
│   │   └── page.tsx         # 市场列表 ✨
│   ├── create/
│   │   └── page.tsx         # 创建市场 ✨
│   ├── market/[address]/
│   │   └── page.tsx         # 市场详情 (含签名) ✨
│   ├── api/
│   │   └── attestations/
│   │       └── route.ts     # 签名 API ✨
│   └── layout.tsx           # 根布局 (PrivyProvider) ✨
├── components/
│   ├── sidebet/             # Sidebet 组件 ✨
│   │   ├── MarketCard.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── StakeModal.tsx
│   │   ├── ProposeModal.tsx
│   │   ├── AttestationModal.tsx  # ✨ 新增
│   │   ├── AttestationList.tsx   # ✨ 新增
│   │   └── LoginModal.tsx        # ✨ 新增
│   └── scaffold-eth/
│       └── RainbowKitCustomConnectButton/  # ✨ 更新支持 Privy
│           ├── index.tsx
│           └── AddressInfoDropdown.tsx
├── hooks/
│   ├── useSidebet.ts        # 市场合约 Hook ✨
│   ├── useSidebetFactory.ts # 工厂合约 Hook ✨
│   ├── useAttestation.ts    # 签名 Hook (双钱包) ✨
│   └── usePrivy.ts          # Privy Hook ✨ 新增
├── privy/
│   └── PrivyProvider.tsx    # Privy Provider ✨ 新增
├── types/
│   └── sidebet.ts           # 类型定义 ✨
└── contracts/
    └── deployedContracts.ts # 部署地址配置

relayer/ ✨ 新增
├── prisma/
│   └── schema.prisma        # 数据库 schema
├── src/
│   ├── config/index.ts      # 配置管理
│   ├── models/database.ts   # Prisma 客户端
│   ├── routes/
│   │   ├── attestations.ts  # 签名 API
│   │   ├── markets.ts       # 市场 API
│   │   └── health.ts        # 健康检查
│   ├── services/
│   │   ├── blockchain.ts    # 区块链服务
│   │   ├── signature.ts     # 签名服务
│   │   └── finalization.ts  # 结算服务
│   ├── utils/
│   │   ├── logger.ts        # 日志
│   │   ├── errors.ts        # 错误类
│   │   └── validation.ts    # 验证
│   └── index.ts             # 服务入口
├── package.json
├── tsconfig.json
├── .env.example
└── README.md

telegram-bot/ ⏳ 待开发
├── src/
│   ├── bot.ts               # Bot 实例
│   ├── handlers/            # 命令处理
│   ├── keyboards/           # 内联键盘
│   └── services/            # 业务服务
├── package.json
└── .env.example
```

---

## 📅 更新日志

### 2025-01-17 - 深夜 v2
- ✅ 完成 Relayer 后端服务
- ✅ 创建 Monad 部署指南
- ✅ 添加部署辅助脚本
- ✅ 更新 Telegram 集成方案 (Bot + Mini App)

### 2025-01-17 - 深夜
- ✅ 完成 Relayer 后端服务
- ✅ 创建 Express API 服务器
- ✅ 实现 Prisma 数据库 schema
- ✅ 创建签名收集服务
- ✅ 实现自动结算服务
- ✅ 添加后台定时任务
- ✅ 实现健康检查端点
- ✅ 添加速率限制和安全头

### 2025-01-17 - 晚上
- ✅ 完成 Privy 钱包集成
- ✅ 创建 `PrivyProvider` 配置
- ✅ 创建 `usePrivy` Hook
- ✅ 创建 `LoginModal` 社交登录弹窗
- ✅ 更新 `useAttestation` 支持双钱包签名
- ✅ 更新 `RainbowKitCustomConnectButton` 支持 Privy
- ✅ 更新 `AddressInfoDropdown` 支持登出
- ✅ 添加 `.env.example` Privy 配置
- ✅ 安装 `@privy-io/react-auth` 依赖

### 2025-01-17 - 下午
- ✅ 完成 EIP-712 签名认证功能
- ✅ 创建 `useAttestation` Hook
- ✅ 创建 `AttestationModal` 组件
- ✅ 创建 `AttestationList` 组件
- ✅ 创建 `/api/attestations` API 路由
- ✅ 更新市场详情页集成签名功能

### 2025-01-17 - 上午
- ✅ 完成前端类型定义
- ✅ 完成合约交互 Hooks
- ✅ 完成 UI 组件 (MarketCard, ProgressBar, StakeModal, ProposeModal)
- ✅ 完成市场列表页面
- ✅ 完成创建市场页面
- ✅ 完成市场详情页面
- ✅ 更新主页入口

---

最后更新: 2025-01-17
