# 生产镜像 / production image —— Node 24（自带 node:sqlite，无需编译）
FROM node:24-slim

WORKDIR /app

# 先装依赖（利用缓存）
COPY package.json package-lock.json ./
RUN npm ci

# 拷贝源码并打包前端
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# 数据目录 /app/data 需挂载持久卷，否则重新部署会丢数据！
# Mount a persistent volume at /app/data or data is lost on redeploy.
VOLUME ["/app/data"]

CMD ["node", "server/index.js"]
