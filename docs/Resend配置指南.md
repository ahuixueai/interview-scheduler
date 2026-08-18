# 📮 验证码邮件配置指南（买域名 + Resend）

> 注册安全已上线：新用户注册必须「拼图滑块 + 邮箱验证码」。验证码邮件由 Resend 免费发送（3000 封/月，个人使用绰绰有余）。
> **配置好之前，线上注册会暂时关闭（返回「邮件服务未配置」）——这是安全设计，防止绕过验证码注册。配好即自动恢复。**

全程约 30 分钟，其中等 DNS 生效最慢可能几小时（通常 5-10 分钟）。

## 第 1 步：买一个域名（约 ¥60-80/年）

任选一家（国内最顺：阿里云）：

1. 打开 https://wanwang.aliyun.com（阿里云万网）或 https://cloud.tencent.com（腾讯云）
2. 搜索一个你喜欢的域名，比如 `mianjing-helper.com` 之类
3. 选 `.com` 最便宜档（首年通常 ¥60-80），**实名认证 + 支付**
4. 买完在「域名控制台」里记下你的域名，例如 `mianjing-helper.com`

> 不需要买服务器！只要域名本身。

## 第 2 步：注册 Resend 账号

1. 打开 https://resend.com
2. 点右上角 **Sign up**，用你的邮箱或 GitHub 账号注册（免费，无需绑卡）
3. 进入后台后点左侧 **Domains → Add Domain**，填你的域名（如 `mianjing-helper.com`）
4. Resend 会显示 **3 条 DNS 记录**（2 条 CNAME 是 DKIM 签名，1 条 TXT/SPF）

## 第 3 步：把 DNS 记录填到域名商后台

以阿里云为例：

1. 打开阿里云「域名控制台」→ 找到你的域名 → 点 **解析**（DNS 解析）
2. 点 **添加记录**，把 Resend 给的每条记录原样抄进去：
   - **记录类型**：CNAME / TXT（照抄）
   - **主机记录**：Resend 显示的值去掉你的域名后缀（如 `send.domainkey`）
   - **记录值**：Resend 显示的完整值（末尾的 `.` 有没有都行）
3. 3 条都加完后，回到 Resend 点 **Verify DNS Records**（或刷新）
4. 等状态全部变绿 ✅（通常 5-10 分钟，偶尔几小时）

## 第 4 步：创建 API Key

1. Resend 后台左侧 **API Keys → Create API Key**
2. 名称随便填（如 `vercel`），权限选 **Sending access**
3. 创建后**立刻复制** `re_xxxxxxxx` 开头的密钥（只显示一次，丢了就重新建）

## 第 5 步：填到 Vercel 并重新部署

1. 打开 https://vercel.com → 进入 `interview-scheduler` 项目
2. **Settings → Environment Variables**，添加两个变量：

| 名称 | 值 |
|---|---|
| `RESEND_API_KEY` | 第 4 步复制的 `re_xxx` |
| `MAIL_FROM` | `面试与笔试日程 <noreply@你的域名>` |

3. 全部填好后，去 **Deployments** 页点最新一次部署右边的 **⋯ → Redeploy**（环境变量只对新部署生效）
4. 等部署完成（约 1 分钟）

## 第 6 步：验收

1. 打开 https://interview-scheduler-five-gamma.vercel.app 注册页
2. 填邮箱密码 → 点「获取验证码」→ 拖拼图对齐缺口 → 去邮箱收 6 位验证码 → 填码注册
3. 能收到邮件并注册成功 = 完成 🎉

## 常见问题

- **`onboarding@resend.dev` 只能发测试邮件**：在域名验证通过前，Resend 只允许用 `onboarding@resend.dev` 发信给你注册 Resend 时用的那个邮箱（仅测试用）。所以正式使用必须完成第 1-3 步的域名验证。
- **收不到/进垃圾箱**：刚验证的域名信誉需要积累，前几封可能进垃圾箱，标记「这不是垃圾邮件」即可；DKIM/SPF 已配置，几天后恢复正常。
- **DNS 记录抄错了**：回到 Resend Domains 页能看到当前状态和正确值，改完重新 Verify 即可。
- **不想要 `.com` 太贵**：`.xyz` / `.top` 首年只要几块钱，同样能用。
