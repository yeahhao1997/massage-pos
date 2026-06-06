# 部署上线指南 / Deployment Guide

## 方案：Render 免费试用（先看到它在公网跑起来）

免费版限制：**闲置15分钟休眠**（下次访问等约30秒唤醒）、**无持久磁盘**（重新部署数据会清空）。
适合试用和演示；正式接客前请看文末「转正」。

---

### 第 1 步：把代码放到 GitHub

Render 从 GitHub 拉代码部署。你需要一个 GitHub 账号（免费）。

1. 注册 https://github.com ，新建一个**私有**仓库，例如 `massage-pos`（不要勾选添加 README）。
2. 在本项目目录执行（把 `你的用户名` 换成你的 GitHub 用户名）：

```bash
git remote add origin https://github.com/你的用户名/massage-pos.git
git branch -M main
git push -u origin main
```

> 推送时会让你登录 GitHub（浏览器授权或输入 token）。这一步在你的终端做：
> 在对话框输入 `! git push -u origin main` 可以让我看到结果帮你排错。

### 第 2 步：在 Render 部署

1. 注册 https://render.com （可用 GitHub 账号一键登录，**免费版不需要信用卡**）。
2. 点 **New +** → **Blueprint**。
3. 选你刚推上去的 `massage-pos` 仓库 → Render 会自动读取 `render.yaml`。
4. 它会要求填一个环境变量 **ADMIN_PASSWORD** —— 输入你想要的**平台管理员密码**（别用 admin123）。
5. 点 **Apply / Create** → 等它构建（约 3-5 分钟，跑 Docker 打包前端）。
6. 完成后会给你一个网址，形如 **`https://massage-pos.onrender.com`**。

### 第 3 步：用起来

- 平台后台 / 店员柜台：`https://massage-pos.onrender.com/`
  - 用 `admin` + 你设的密码登录 → 入驻真实门店、创建店老板账号
- 顾客端：`https://massage-pos.onrender.com/m`
  - 把这个网址发给顾客（或做成二维码贴店里）

> 提示：免费库是空的（没有演示门店），第一次登录后用平台管理员入驻你的真实门店即可。
> 想先放演示数据看效果，可在 Render 环境变量加 `SEED_DEMO=true` 重新部署。

---

## 转正：正式接真实顾客（要数据不丢）

免费版数据会重置，正式用之前二选一：

**A. 留在 Render，加持久磁盘**（最省事）
- 把 `render.yaml` 里 `plan: free` 改成 `plan: starter`（约 US$7/月），并加：
  ```yaml
    disk:
      name: data
      mountPath: /app/data
      sizeGB: 1
  ```
- 重新部署。SQLite 文件 `/app/data/platform.db` 就持久了，也不再休眠。

**B. 换便宜 VPS（最省钱最稳，SQLite 友好）**
- DigitalOcean / Vultr / 或 **Oracle Cloud 永久免费 VM**（真免费但配置稍复杂）
- 用 Docker + Caddy（自动 HTTPS）。需要时我给你一键 `docker-compose.yml` + 步骤。

## 绑自己的域名（可选）

- 先用免费的 `xxx.onrender.com` 即可上线。
- 以后买了域名（约 US$10/年，如 Namecheap / Cloudflare），在 Render 的 **Settings → Custom Domain** 添加，按提示在域名商那里加一条 CNAME 记录指向 Render，HTTPS 证书 Render 自动签发。

## 数据备份

- 数据全在 `data/platform.db` 一个文件。
- VPS/持久磁盘方案：定期把这个文件拷出来就是完整备份。
- 重要：免费版没有持久磁盘，**不要在免费版上存真实数据**。
