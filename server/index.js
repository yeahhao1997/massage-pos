// 服务入口：挂载 API，生产环境同时托管前端静态文件
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';

import './db.js';
import auth from './routes/auth.js';
import admin from './routes/admin.js';
import publicRoutes from './routes/public.js';
import members from './routes/members.js';
import catalog from './routes/catalog.js';
import appointments from './routes/appointments.js';
import orders from './routes/orders.js';
import reports from './routes/reports.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1); // 部署在反代/平台后面时，正确识别客户端 IP（用于限流）
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/public', publicRoutes);
app.use('/api/admin', admin);
app.use('/api/members', members);
app.use('/api/catalog', catalog);
app.use('/api/appointments', appointments);
app.use('/api/orders', orders);
app.use('/api/reports', reports);

// 生产：托管 vite 打包结果
const dist = join(__dirname, '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  // 打印局域网地址，方便手机扫码访问
  const ips = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) ips.push(ni.address);
    }
  }
  console.log(`\n  按摩院柜台系统已启动`);
  console.log(`  本机:    http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  局域网:  http://${ip}:${PORT}   (手机连同一WiFi可访问)`));
  console.log('');
});
