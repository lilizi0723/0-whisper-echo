# 后端服务

## 启动方式

当前目录为 `backend` 时，直接运行：

```bash
node src/index.js
```

如果是从项目根目录启动：

```bash
cd backend && node src/index.js
```

## 端口占用

如遇 `EADDRINUSE: address already in use :::8787`，先释放 8787 端口：

```bash
lsof -ti:8787 | xargs kill -9
```

然后重新启动后端。
