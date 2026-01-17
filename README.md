# 🎲 Sidebets - Social Consensus Betting on Monad

> Transform social debates into on-chain settlements through EIP-712 signature aggregation

## 🎯 项目概述

Sidebets 是一个去中心化的社交投注协议，允许用户在社交平台上创建争论话题，通过链下签名聚合达成共识，最终在 Monad 链上完成结算。

### 核心特性

| 特性 | 描述 |
|------|------|
| **零 Gas 认证** | 用户使用 EIP-712 签名参与，无需支付 Gas |
| **社交共识** | 参与者投票决定最终结果，阈值可配置 (50%-99%) |
| **争议机制** | 2 小时争议窗口，防止恶意结算 |
| **CREATE2 部署** | 可预测合约地址，便于前端集成 |
| **Monad 优化** | 并行执行友好，充分利用 Monad 高性能 |
| **资金托管** | ERC20 代币锁定，智能合约自动分配 |

## 🏗️ 合约架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Sidebets 合约系统                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐        ┌─────────────────┐           │
│   │ SidebetFactory  │───────>│   Sidebet N     │           │
│   │   (工厂合约)     │ create2│   (市场合约)     │           │
│   │                 │        │                 │           │
│   │ - 创建市场       │        │ - 资金托管       │           │
│   │ - 索引管理       │        │ - EIP-712 验证   │           │
│   │ - 地址预测       │        │ - 共识结算       │           │
│   └─────────────────┘        └─────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 合约列表

| 合约 | 文件 | 功能 |
|------|------|------|
| `SidebetFactory` | `contracts/SidebetFactory.sol` | 创建和管理市场 |
| `Sidebet` | `contracts/Sidebet.sol` | 核心市场逻辑 |
| `MockToken` | `contracts/mocks/MockToken.sol` | 测试用 ERC20 代币 |
| `ISidebet` | `contracts/interfaces/ISidebet.sol` | 接口定义 |

## 📁 项目结构

```
packages/hardhat/
├── contracts/
│   ├── interfaces/
│   │   └── ISidebet.sol           # 接口定义
│   ├── mocks/
│   │   └── MockToken.sol          # Mock USDC
│   ├── Sidebet.sol                # 核心市场合约
│   └── SidebetFactory.sol         # 工厂合约
├── deploy/
│   └── 01_deploy_sidebet_factory.ts
├── test/
│   └── Sidebet.test.ts            # 测试文件 (38个测试全部通过)
└── ...

packages/nextjs/
├── contracts/
│   └── deployedContracts.ts       # 合约地址配置
└── ...

docs/
├── 03-智能合约层.md                 # 智能合约开发文档
└── ...
```

## 🚀 快速开始

### 环境要求

- Node.js >= v20.18.3
- Yarn v1 或 v2+
- Git

### 安装

```bash
# 安装依赖
yarn install

# 启动本地网络
yarn chain

# 部署合约
yarn deploy

# 运行测试
yarn hardhat:test

# 启动前端
yarn start
```

访问 `http://localhost:3000`

## 🧪 测试

```bash
# 运行所有测试
yarn hardhat:test

# 查看测试覆盖率
yarn hardhat:coverage

# 查看Gas报告
REPORT_GAS=true yarn hardhat:test
```

### 测试结果

```
✔ 38 passing (845ms)
✗ 0 failing
```

| 测试类别 | 测试数量 | 状态 |
|----------|----------|------|
| SidebetFactory | 4 | ✅ |
| Market Creation | 4 | ✅ |
| Staking | 5 | ✅ |
| Proposal | 3 | ✅ |
| Consensus & Finalization | 7 | ✅ |
| Dispute | 3 | ✅ |
| Cancellation | 4 | ✅ |
| Progress Tracking | 2 | ✅ |
| MockToken | 4 | ✅ |

## 📊 Gas 成本

| 操作 | Gas 消耗 |
|------|----------|
| `createSidebet()` | ~2,010,000 |
| `stake()` | ~160,000 |
| `proposeResult()` | ~161,000 |
| `finalizeWithConsensus()` | ~294,000 |
| `dispute()` | ~37,000 |
| `cancel()` | ~68,000 |

## 🔧 开发指南

### 添加新市场

```typescript
// 通过工厂创建市场
const tx = await factory.createSidebet(
  "BTC能否突破10万美元?",      // topic
  6000,                       // 60% 阈值
  usdcAddress,                // 代币地址
  ethers.parseEther("100")    // 最小投注
);
```

### 参与投注

```typescript
// 用户投注
await sidebet.connect(user).stake(
  ethers.parseEther("200"),  // 金额
  1                           // 投"是"
);
```

### 提交结果提案

```typescript
// 任何人都可以提案
await sidebet.connect(anyone).proposeResult(
  1,                           // 结果
  ethers.encodeBytes32String("证据IPFS哈希")
);
```

### 签名认证 (EIP-712)

```typescript
const domain = {
  name: "Sidebet",
  version: "1",
  chainId: chainId,
  verifyingContract: marketAddress,
};

const types = {
  Attestation: [
    { name: "market", type: "address" },
    { name: "outcome", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
};

const value = {
  market: marketAddress,
  outcome: 1,
  nonce: await sidebet.nonce(),
};

// 使用 Privy 或钱包签名
const signature = await signer.signTypedData(domain, types, value);
```

## 🔐 安全考虑

- **重放攻击防护**: Domain Separator + Nonce
- **重入攻击防护**: OpenZeppelin ReentrancyGuard
- **整数溢出防护**: Solidity 0.8+ 内置检查
- **争议机制**: 2小时争议窗口
- **合约检查**: 禁止合约地址参与

## 📄 许可证

MIT

## 🙏 致谢

- [Scaffold-ETH 2](https://github.com/scaffold-eth/scaffold-eth-2) - 开发框架
- [OpenZeppelin](https://openzeppelin.com/) - 安全合约库
- [Monad](https://monad.xyz/) - 高性能 Layer1
