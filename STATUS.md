# 项目进度存档 / Project Status

> Litter Malaysia 按摩院多商户平台。最后更新：2026-06-07

## 一句话

马来西亚多商户按摩平台：会员卡全平台通用 + 店间结算 + 顾客端在线预约，已做完功能、改温泉绿主题、本地化为 RM、预装三店与照片，**代码已全部推到 GitHub，等部署到 Render**。

## 当前进度

| 阶段 | 状态 |
|---|---|
| 多商户后端（鉴权/角色/数据隔离/中央钱包/店间结算） | ✅ |
| 前端：登录 + 平台管理员控制台 + 店员柜台 + 顾客端 marketplace | ✅ |
| 本地化：货币 RM、马来西亚支付方式、中英双语 | ✅ |
| UI：温泉养生绿主题 | ✅ |
| 预装三店（KL/JB/Penang）+ 标准服务 + dummy 会员 | ✅ |
| 门店照片（硬编码打包 `public/shops/*.jpg`） | ✅ |
| 上线安全加固（env 密码、令牌过期、改密码、限流） | ✅ |
| 推送到 GitHub | ✅ `github.com/yeahhao1997/massage-pos` |
| **部署到 Render** | ⏳ 待完成（手动 Web Service，免费不绑卡） |

## 账号清单（演示/初始）

| 角色 | 账号 | 密码 | 入口 |
|---|---|---|---|
| 平台管理员 | `admin` | 部署时用环境变量 `ADMIN_PASSWORD` 设；本地默认 `admin123` | `/` |
| KL 店老板 | `kl` | `kl123` | `/` |
| JB 店老板 | `jb` | `jb123` | `/` |
| Penang 店老板 | `penang` | `penang123` | `/` |
| 会员（顾客端演示） | 卡号 `VIP0001` | 手机 `012-3456789` | `/m` → 我的 |

> ⚠️ 上线后请尽快改掉店老板默认密码（店员登录后可改；或重新入驻）。

## 部署：下一步

1. https://render.com 用 GitHub 登录
2. **New + → Web Service**（不是 Blueprint，Blueprint 要绑卡）
3. 选 `massage-pos` 仓库 → 自动识别 Dockerfile
4. Name=massage-pos，Region=Singapore，Branch=main，Instance=**Free**
5. 环境变量：`NODE_ENV=production`、`ADMIN_PASSWORD=（你的密码）`
6. Create → 等 3–5 分钟 → 拿到 `https://xxx.onrender.com`
   - 后台/柜台：`网址/`　顾客端：`网址/m`

详细见 `DEPLOY.md`。

## 免费版限制（重要）

- 闲置 15 分钟休眠，再访问约 30 秒唤醒
- **无持久磁盘**：重新部署 / 休眠重启会重置数据
  - 三店、服务、dummy 会员、三店照片会**自动重新生成**（写进初始数据了）
  - 但运行中新增的真实会员、充值、改的价格、新传的照片会丢
- 仅适合试用/演示。正式接客要数据不丢 → 升 Render 持久磁盘（约 US$7/月）或换 VPS

## 还没做 / Roadmap

- 转正持久化部署（持久磁盘 / VPS）
- 小票打印、预约提醒（短信/WhatsApp）、会员到期&生日提醒
- 真实支付网关对接（TnG/FPX/GrabPay）、订单退款
- 绑自己的域名

## 关键文档

- `README.md` 怎么本地跑　`FEATURES.md` 功能清单　`DEPLOY.md` 部署步骤　`STATUS.md` 本文件
