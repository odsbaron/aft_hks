# 私钥配置指南

> Sidebets 智能合约部署私钥配置文档

---

## 📋 目录

1. [快速开始](#快速开始)
2. [方法一：生成新账户（推荐）](#方法一生成新账户推荐)
3. [方法二：导入现有私钥](#方法二导入现有私钥)
4. [方法三：使用 Hardhat 默认账户](#方法三使用-hardhat-默认账户)
5. [添加 Monad 网络配置](#添加-monad-网络配置)
6. [常见问题](#常见问题)

---

## 快速开始

### 本地开发（无需配置）

本地开发使用 Hardhat 内置账户，**无需配置私钥**：

```bash
# 1. 启动本地网络
yarn chain

# 2. 部署合约（使用默认账户）
yarn deploy
```

### 部署到测试网/主网

需要配置私钥，请选择以下任一方法。

---

## 方法一：生成新账户（推荐）

### 步骤

1. **生成新账户**

```bash
yarn account:generate
```

输出示例：
```
🔐 Generated new account

Address:     0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private key: 0x...（完整的私钥）

⚠️  请妥善保管此私钥！

? 请输入密码用于加密私钥: [输入密码]
```

2. **查看账户**

```bash
yarn account
```

3. **获取测试币**

获取对应测试网的测试币（如 Sepolia ETH）

4. **部署合约**

```bash
# 部署到 Sepolia 测试网
yarn deploy --network sepolia
```

---

## 方法二：导入现有私钥

### 步骤

1. **导入私钥**

```bash
yarn account:import
```

系统会提示：
```
? 请输入你的私钥 (0x...): [粘贴你的私钥]
? 请输入加密密码: [输入密码]
```

2. **查看已导入账户**

```bash
yarn account
```

输出示例：
```
📋 Deployer Account:

Address:   0xYourAddress...
Balance:   0.1 ETH

加密的私钥已保存到 .env 文件
```

---

## 方法三：使用 Hardhat 默认账户

### 步骤

直接在 `hardhat.config.ts` 中配置（仅用于开发）：

```typescript
// hardhat.config.ts

const deployerPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
// 这是 Hardhat 默认的 account #0，仅用于本地开发！
```

⚠️ **警告**：此私钥公开，仅用于本地测试，**切勿用于主网部署**！

---

## 添加 Monad 网络配置

### 1. 编辑 `hardhat.config.ts`

在 `networks` 配置中添加 Monad 测试网：

```typescript
// hardhat.config.ts

networks: {
  // ... 其他网络配置

  // Monad 测试网
  monadTestnet: {
    url: "https://testnet-rpc.monad.xyz",
    chainId: 41454,  // Monad 测试网 Chain ID
    accounts: [deployerPrivateKey],
  },

  // Monad 主网 (上线后使用)
  monad: {
    url: "https://rpc.monad.xyz",
    chainId: 41455,
    accounts: [deployerPrivateKey],
  },
}
```

### 2. 配置环境变量 (可选)

创建 `packages/hardhat/.env` 文件：

```bash
# Monad RPC
MONAD_TESTNET_RPC=https://testnet-rpc.monad.xyz
MONAD_MAINNET_RPC=https://rpc.monad.xyz

# Alchemy API Key (可选，用于其他网络)
ALCHEMY_API_KEY=your_alchemy_api_key

# Etherscan API Key (用于验证合约)
ETHERSCAN_V2_API_KEY=your_etherscan_api_key
```

### 3. 部署到 Monad

```bash
# 部署到 Monad 测试网
yarn deploy --network monadTestnet

# 部署到 Monad 主网
yarn deploy --network monad
```

---

## 完整部署流程示例

### 本地开发

```bash
# 终端 1: 启动本地网络
yarn chain

# 终端 2: 部署合约
yarn deploy

# 终端 3: 启动前端
yarn start
```

### 部署到测试网

```bash
# 1. 生成/导入账户
yarn account:generate
# 或
yarn account:import

# 2. 获取测试币（从水龙头）
# 访对应网络的 faucet

# 3. 部署
yarn deploy --network sepolia
```

### 部署到 Monad

```bash
# 1. 确保 hardhat.config.ts 已配置 Monad 网络

# 2. 使用已配置的账户部署
yarn deploy --network monadTestnet
```

---

## 常见问题

### Q1: 忘记加密密码怎么办？

删除 `.env` 文件中的 `DEPLOYER_PRIVATE_KEY_ENCRYPTED`，重新导入私钥。

### Q2: 如何查看私钥？

```bash
yarn account:reveal-pk
```

### Q3: 本地测试使用哪个账户？

本地使用 Hardhat 内置的 20 个测试账户：

```bash
yarn account
```

输出：
```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB882737927F9F891ef (10000 ETH)
Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...
```

### Q4: 部署时报错 "insufficient funds"

确保部署账户有足够的测试币：

```bash
# 查看账户余额
yarn account

# 去水龙头获取测试币
# Sepolia: https://sepoliafaucet.com/
# Monad: https://faucet.monad.xyz/
```

### Q5: 如何切换部署账户？

```bash
# 查看当前账户
yarn account

# 导入新账户
yarn account:import
```

---

## 安全提醒

⚠️ **重要安全规则**

1. **永远不要提交 .env 文件到 Git**
2. **主网部署使用专用钱包，不要存大量资金**
3. **定期备份私钥**
4. **使用硬件钱包进行主网部署（推荐）**

```bash
# 确保 .env 在 .gitignore 中
echo ".env" >> .gitignore
```

---

## 快捷命令参考

| 命令 | 功能 |
|------|------|
| `yarn account` | 查看当前账户和余额 |
| `yarn account:generate` | 生成新账户 |
| `yarn account:import` | 导入现有私钥 |
| `yarn account:reveal-pk` | 查看私钥 |
| `yarn deploy` | 部署到默认网络 |
| `yarn deploy --network <网络名>` | 部署到指定网络 |
| `yarn hardhat:test` | 运行测试 |
