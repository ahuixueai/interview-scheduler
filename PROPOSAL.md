# 「面试日历提醒」产品化方案（v0.1，供评审）

> 结论先行：**可行，起步成本约 0 元/月**。核心思路是——提醒投递完全交给 Google 日历本身，我们只负责「管理 + 同步」。最大不确定性是 Google OAuth 生产审核的等待时间，但测试模式可让 100 个真实用户先行内测。

---

## 1. 一句话定义

一个面向求职者的日程工具：**用 Google 账号登录，管理面试/笔试日程，事件自动同步到自己的 Google 日历，到点由 Google 自动发邮件/弹窗/手机推送提醒**。

## 2. 现状盘点（原型已具备的能力）

| 已具备 | 说明 |
|---|---|
| 日程管理 UI | 优先级排序、左右滑动改状态、拖拽排序、备战胶囊、专注模式、双时区 |
| 面试/子日历 CRUD | 新建/编辑/删除 + 本地持久化 |
| 日历集成雏形 | 免登录模板链接、.ics 导出、**前端版** Google OAuth + 推送/拉取 |
| 工程质量 | tsc/eslint 0 问题、单测 21、e2e 65+ 断言、对比度/视觉 QA、性能探针 |

**差距**：没有用户账号、没有数据库、OAuth token 是前端临时的（1 小时过期）、提醒机制没有接入。

## 3. 目标形态与核心用户故事

1. 我打开应用 → 「使用 Google 登录」→ 首次使用自动加载演示数据，可一键清空。
2. 我点「连接日历」→ Google 弹窗授权 → 我的所有面试自动进入我的 Google 日历。
3. 我改了一场面试的时间 → 日历上的事件同步更新。
4. 面试前一天 / 一小时前 / 半小时前 → 我收到 Google 日历的**邮件 + 弹窗 + 手机推送**。
5. 换台电脑登录 → 数据都在（存在云端数据库）。

## 4. 可行性总评

| 维度 | 评估 | 依据 |
|---|---|---|
| 技术 | ✅ 成熟组合 | Next.js 全栈 + Postgres + Google Calendar API，全部是行业标准件 |
| 成本 | ✅ 零成本起步 | Vercel 免费档 + Supabase/Neon 免费档 + Google API 免费额度 |
| 时间 | ⚠️ 1-2 个月到可发布 | 开发 3-5 周 + Google 审核等待（几天到几周，可并行内测） |
| 合规 | ⚠️ 唯一硬门槛 | calendar.events 是「敏感」scope，公开上线需 Google 验证（免费） |

## 5. 系统架构

    浏览器 App (Next.js)
         │ HTTPS
         ▼
    Next.js 全栈（托管 Vercel / 自建 Docker）
    ├─ 页面 + API 路由
    ├─ 登录会话（Auth.js + Google）
    ├─ 业务逻辑（面试 / 日历 / 提醒设置）
    └─ 同步引擎（变更即推送 + 每 6 小时增量拉取）
         │                │
         ▼                ▼
    Postgres 数据库     Google 服务
    （用户/日程/        ├ OAuth 授权
      token/同步日志）   └ Calendar API（事件 + 提醒字段）
                               │ Google 投递提醒
                               ▼
                        Gmail 邮件 / 浏览器弹窗 / 手机 App 推送

## 6. 核心链路

**登录**：点「使用 Google 登录」→ Google 账号页确认 → 拿到身份（名字/邮箱）→ 服务端建会话。

**连接日历（渐进授权）**：首次登录只拿基础身份；点「连接日历」再申请 calendar.events 权限 → 服务端用授权码换 **refresh token（长期有效）** 加密存库。

**同步**：任何本地增删改 → 立即调用 Calendar API 同步；每 6 小时跑一次增量同步兜底（拉取远端变更）。

**提醒（本方案最关键的决策）**：创建事件时写入提醒配置：

    "reminders": {
      "useDefault": false,
      "overrides": [
        { "method": "email", "minutes": 1440 },
        { "method": "popup", "minutes": 60 },
        { "method": "popup", "minutes": 30 }
      ]
    }

到点后**由 Google 自己**发 Gmail 邮件、浏览器弹窗、手机端推送。我们零运维、零投递成本。

## 7. 提醒机制的三种方案对比（重点评审项）

| 方案 | 可靠性 | 成本 | 合规 | 结论 |
|---|---|---|---|---|
| A. Google 日历自带提醒（事件上写 overrides） | 高 | 0 | 仅需 calendar.events | ✅ v1 采用 |
| B. Gmail API 由我们发邮件 | 高 | 0 | ⚠️ gmail 是 restricted scope，需安全评估，审核慢且严 | ❌ v1 不做 |
| C. 自己发邮件（Resend/SES） | 中（进垃圾箱风险） | 低 | 一般 | ⏸️ 备选 |
| D. 浏览器 Web Push（关标签页也能收到） | 中高 | 0 | 无需 Google | ⏸️ 阶段 3 可选增强 |

## 8. 数据模型草案

    users           (id, google_sub, email, name, created_at)
    calendar_links  (user_id, refresh_token_encrypted, access_token, expires_at, calendar_id)
    sub_calendars   (id, user_id, name, color)
    interviews      (id, user_id, sub_calendar_id, company, position, type,
                     importance, status, start_utc, end_utc, source_time_zone,
                     prep_json, external_event_id, reminder_config_json)
    sync_logs       (id, user_id, action, status, detail, created_at)  -- 排障用

现有原型的时间规范（UTC 存储 + IANA 时区 + Intl 转换）原样保留。

## 9. OAuth 合规路线

| 阶段 | 状态 | 能力 |
|---|---|---|
| 测试模式（免费，默认） | 立即可用 | 最多 100 个用户，测试者邮箱在 Google Cloud 加白名单 |
| 生产验证（免费，需审核） | 几天~几周 | 无人数限制；需提供：隐私政策 URL、应用主页、授权用途说明 |

**对策**：开发期全程测试模式；功能完成即提交验证；审核期间用测试模式内测。

## 10. 开源计划

- 许可证：**MIT**（宽松传播）或 AGPL（防云厂商白嫖）——二选一，建议 MIT。
- 仓库：源码 + CI + README（含「三步配置自己的 Google OAuth」指引），任何人均可自托管。
- 安全红线：.env 不提交；只提交 .env.example；refresh token 仅存服务端并加密。
- 当前项目已是 git 仓库但无提交，阶段 0 直接初始化 + 推 GitHub。

## 11. 路线图

| 阶段 | 目标 | 主要交付物 | 验收标准 |
|---|---|---|---|
| **0 开源奠基** | 上 GitHub、可协作 | git 提交、MIT、README、.env.example、CI(Actions)、issue 模板 | CI badge 全绿 |
| **1 账号+数据层** | 登录 + 云端存储 | Auth.js（邮箱密码 + Google 可选）、Postgres schema、CRUD 迁 API、按用户隔离 | 注册→登录→增删改→换设备数据一致 |
| **2 日历同步+提醒** | 核心卖点落地 | 服务端 OAuth+refresh token、推送带提醒、增量同步、同步面板 | 真机验证：授权→日历出现事件→到点收到 Google 邮件 |
| **3 提醒增强** | 体验完善 | 提醒时机自定义、通知中心、6h 增量 cron、token 自动续期 | 改提醒设置→日历端同步生效 |
| **4 发布** | 面向公众 | Google OAuth 验证、隐私政策、部署上线、监控、账户删除/数据导出 | 外部用户可注册使用 |

预估节奏（个人开发投入）：阶段 1 ≈ 2-3 周，阶段 2 ≈ 1-2 周 + 审核等待，阶段 3 ≈ 1 周。

## 12. 成本

| 项 | 费用 |
|---|---|
| Vercel + Supabase/Neon + Google API | ¥0/月（小规模） |
| 域名 + 隐私政策页 | 约 ¥60-80/年 |
| Google OAuth 验证 | 免费 |

## 13. 风险与对策

1. **OAuth 审核慢** → 测试模式 100 人先行内测，审核并行推进。
2. **提醒依赖 Google 投递**（用户若关掉日历通知则收不到）→ 应用内引导设置 + 阶段 3 加 Web Push 兜底。
3. **多用户数据隔离**是安全重点 → 所有查询强制带 user_id，e2e 加越权测试。
4. 若未来要短信/微信提醒 → 成本显著上升，明确列为远期项，不进 v1。

## 14. 已确认的决策（2025-08-17）

1. **登录方式：多元化** ✅ —— 不以 Gmail 为前提，支持国内外多种邮箱。设计调整为：
   - 主路径：**邮箱 + 密码**（任意邮箱均可注册：QQ 邮箱 / 163 / Outlook / Gmail 等，bcrypt 哈希存储）
   - 快捷路径：**Google 一键登录**（可选绑定，国际用户更顺滑）
   - 验证码登录 + 密码找回：依赖邮件发送服务（Resend 免费 3000 封/月），阶段 3 加入
   - 影响：阶段 1 需要引入 Auth.js（Credentials 邮箱密码 + Google Provider），并新增密码重置流程设计
2. **许可证：MIT** ✅
3. **托管：Vercel + Supabase/Neon 免费云** ✅
4. **GitHub：由用户账号创建仓库（浏览器操作）**，其余全部代劳；部署步骤见 docs/部署指南.md

## 15. 当前进度

- ✅ 阶段 0 本地部分已全部完成：git 初始化、MIT、README、.env.example、CI（Actions）、部署指南、截图归档
- ⏳ 等待你在 GitHub 上创建仓库并登录 gh（部署指南第一步），随后我执行推送
- ▶️ 阶段 1（账号 + 数据层）随后启动
