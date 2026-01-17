# Monad Testnet 部署指南

> Sidebets 合约部署到 Monad Testnet 完整流程

---

## 📋 当前状态分析

### ✅ 已完成配置

| 项目 | 状态 | 说明 |
|------|------|------|
| Hardhat 配置 | ✅ | `monadTestnet` 网络已配置 |
| RPC 端点 | ✅ | Ankr RPC (稳定) |
| Chain ID | ✅ | 10143 |
| 部署脚本 | ✅ | `01_deploy_sidebet_factory.ts` |
| 合约代码 | ✅ | SidebetFactory + MockToken |

### 🔧 需要准备

| 项目 | 状态 | 说明 |
|------|------|------|
| 部署账户私钥 | ❌ | 需要配置到 `.env` |
| 测试币 | ❌ | 需要从 faucet 获取 |
| 合约验证 | ⚠️ | Monad 暂无支持 (手动处理) |

---

## 🚀 部署步骤

### 第一步: 配置部署账户

1. **生成或导入私钥**

```bash
cd packages/hardhat

# 生成新账户
yarn generate

# 或导入现有账户
yarn account:import
```

2. **配置环境变量**

编辑 `packages/hardhat/.env`:

```bash
# 部署账户私钥 (不要提交到 git!)
__RUNTIME_DEPLOYER_PRIVATE_KEY=0x...

# 或使用默认 hardhat 账户 (仅测试)
# __RUNTIME_DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### 第二步: 获取测试币

1. **获取部署账户地址**

```bash
yarn hardhat run scripts/showAccount.ts --network monadTestnet
```

或使用 `hardhat console`:

```bash
yarn hardhat console --network monadTestnet

> (await ethers.getSigners())[0].address
'0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
> .exit
```

2. **从 Faucet 获取测试币**

访问以下任一 faucet:
- https://faucet.monad.xyz/
- https://paradigm.xyz/faucet
- https://cloud.google.com/application/web3/faucet/ethereum/monad

> ⚠️ Monad Testnet 使用原生 token (MON) 支付 gas，不需要额外代币

### 第三步: 验证网络连接

```bash
# 测试 RPC 连接
yarn hardhat run scripts/verifyConnection.ts --network monadTestnet
```

创建验证脚本 `scripts/verifyConnection.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(signer.address);
  const blockNumber = await ethers.provider.getBlockNumber();

  console.log("🔗 Network: monadTestnet");
  console.log("📦 Deployer:", signer.address);
  console.log("💰 Balance:", ethers.formatEther(balance), "MON");
  console.log("🧱 Block:", blockNumber);

  if (balance === 0n) {
    console.error("❌ No balance! Please get testnet MON from faucet");
    process.exit(1);
  }
}

main().catch(console.error);
```

### 第四步: 部署合约

```bash
cd packages/hardhat

# 部署到 Monad Testnet
yarn deploy --network monadTestnet
```

**预期输出:**

```
✅ SidebetFactory deployed to: 0x...
✅ MockToken deployed to: 0x...
📦 Factory deployer: 0x...
🔗 Explorer: https://explorer.testnet.monad.xyz/address/0x...
```

### 第五步: 记录部署地址

部署完成后，将合约地址保存到:

1. `packages/nextjs/.env.local`:
```bash
NEXT_PUBLIC_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_RPC_URL=https://rpc.ankr.com/monad_testnet
```

2. `relayer/.env`:
```bash
SIDEBET_FACTORY_ADDRESS=0x...
MOCK_TOKEN_ADDRESS=0x...
RPC_URL=https://rpc.ankr.com/monad_testnet
CHAIN_ID=10143
```

---

## ✅ 验证部署

### 1. 在浏览器验证

访问: https://explorer.testnet.monad.xyz/address/`<FACTORY_ADDRESS>`

检查:
- [ ] 合约已创建
- [ ] 创建者正确
- [ ] 有交易记录

### 2. 运行验证脚本

```bash
yarn hardhat run scripts/verifyDeployment.ts --network monadTestnet
```

创建 `scripts/verifyDeployment.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const factoryAddress = process.env.FACTORY_ADDRESS;
  const tokenAddress = process.env.TOKEN_ADDRESS;

  if (!factoryAddress) {
    console.error("❌ FACTORY_ADDRESS not set");
    process.exit(1);
  }

  // 验证 Factory
  const factory = await ethers.getContractAt("SidebetFactory", factoryAddress);
  const owner = await factory.owner();
  const marketCount = await factory.getMarketCount();

  console.log("✅ SidebetFactory");
  console.log("  Address:", factoryAddress);
  console.log("  Owner:", owner);
  console.log("  Markets:", marketCount.toString());

  // 验证 Token
  if (tokenAddress) {
    const token = await ethers.getContractAt("MockToken", tokenAddress);
    const [name, symbol, decimals] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
    ]);

    console.log("✅ MockToken");
    console.log("  Address:", tokenAddress);
    console.log("  Name:", name);
    console.log("  Symbol:", symbol);
    console.log("  Decimals:", decimals);
  }
}

main().catch(console.error);
```

### 3. 测试合约功能

```bash
yarn hardhat test --network monadTestnet
```

---

## 🔧 前端配置

### 1. 更新 Scaffold 配置

编辑 `packages/nextjs/scaffold.config.ts`:

```typescript
export const scaffoldConfig = {
  targetNetworks: [
    {
      id: 10143, // Monad Testnet
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
          apiUrl: "https://explorer.testnet.monad.xyz/api",
        },
      ],
    },
  ],
  // ...
};
```

### 2. 更新 deployedContracts.ts

编辑 `packages/nextjs/contracts/deployedContracts.ts`:

```typescript
import { SidebetFactory } from "./typechain-types";
import factoryAbi from "./SidebetFactory.json";

export const deployedContracts = {
  [10143]: {
    // Chain ID 10143 = Monad Testnet
    SidebetFactory: {
      address: "0x...", // 部署后的地址
      abi: factoryAbi,
    } as SidebetFactory,
  },
};
```

### 3. 添加网络到 Wagmi

如果使用 RainbowKit，需要添加 Monad 网络:

```typescript
import { getDefaultWallets } from "@rainbow-me/rainbowkit";
import { configureChains, chain } from "wagmi";

const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad testnet",
  nativeCurrency: {
    decimals: 18,
    name: "MON",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.ankr.com/monad_testnet"],
    },
    public: {
      http: ["https://rpc.ankr.com/monad_testnet"],
    },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://explorer.testnet.monad.xyz" },
  },
  testnet: true,
};

// ... 在 RainbowKit 配置中使用
```

---

## 🔄 Relayer 配置

更新 `relayer/.env`:

```bash
# 已部署的合约地址
SIDEBET_FACTORY_ADDRESS=0x... (从部署输出获取)
MOCK_TOKEN_ADDRESS=0x...

# Monad Testnet RPC
RPC_URL=https://rpc.ankr.com/monad_testnet
CHAIN_ID=10143

# Relayer 私钥
RELAYER_PRIVATE_KEY=0x... (建议使用独立账户)

# 配置
MIN_SIGNATURES_THRESHOLD=3
MAX_PROPOSAL_AGE_HOURS=24
```

---

## 🧪 测试部署

### 1. 创建测试市场

```bash
yarn hardhat run scripts/createTestMarket.ts --network monadTestnet
```

### 2. 验证前端

```bash
cd packages/nextjs
yarn start

# 访问 http://localhost:3000/markets
# 创建一个市场并验证流程
```

### 3. 验证 Relayer

```bash
cd relayer
npm run dev

# 检查健康状态
curl http://localhost:3001/health/detailed
```

---

## ⚠️ 常见问题

### 1. RPC 连接失败

**问题**: `network connection timeout`

**解决方案**:
- 尝试备用 RPC: `https://testnet-rpc.monad.xyz`
- 检查网络连接
- 增加 `timeout` 配置

### 2. 账户余额不足

**问题**: `insufficient funds for gas`

**解决方案**:
```bash
# 检查余额
yarn hardhat run scripts/checkBalance.ts --network monadTestnet

# 从 faucet 获取测试币
# https://faucet.monad.xyz/
```

### 3. Gas 价格过高

**问题**: 交易费用太贵

**解决方案**:
```typescript
// 在部署脚本中设置 gas 限制
const factory = await deploy("SidebetFactory", {
  from: deployer,
  args: [deployer],
  gasLimit: 3000000,
  gasPrice: ethers.parseUnits("1", "gwei"), // 设置低 gas 价格
  log: true,
});
```

### 4. 合约验证失败

**问题**: Etherscan 验证不通过

**解决方案**:
- Monad Testnet 暂不支持自动验证
- 手动在 Explorer 上验证源码
- 或跳过验证，仅记录地址

---

## 📝 部署检查清单

- [ ] 配置部署私钥到 `.env`
- [ ] 获取部署账户地址
- [ ] 从 faucet 获取测试币
- [ ] 验证 RPC 连接
- [ ] 部署合约到 monadTestnet
- [ ] 记录合约地址
- [ ] 在 Explorer 验证合约
- [ ] 更新前端配置
- [ ] 更新 Relayer 配置
- [ ] 测试创建市场
- [ ] 测试完整流程 (stake → propose → attest → finalize)
- [ ] 启动 Relayer 服务

---

## 🔗 有用链接

| 资源 | 链接 |
|------|------|
| Monad 文档 | https://docs.monad.xyz/ |
| Testnet RPC | https://rpc.ankr.com/monad_testnet |
| Faucet | https://faucet.monad.xyz/ |
| Explorer | https://explorer.testnet.monad.xyz |
| Discord | https://discord.gg/monad |

---

## 📅 部署后任务

部署完成后，按顺序完成:

1. ✅ 验证合约功能
2. ⏳ 创建几个测试市场
3. ⏳ 测试完整投注流程
4. ⏳ 配置前端环境变量
5. ⏳ 启动 Relayer 服务
6. ⏳ 准备黑客松演示

---

生成时间: 2025-01-17
