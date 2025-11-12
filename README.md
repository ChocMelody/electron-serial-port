# Electron Serial Port HTTP Forwarder

这是一个基于 Electron、Vue 3 和 NestJS 的桌面应用程序，用于将串口数据转发到 HTTP 接口。

## 功能特性

- 实时读取串口数据
- 将串口数据转发到指定的 HTTP 接口
- 图形化用户界面，方便配置和监控
- 支持多种串口参数配置（波特率、数据位、停止位、校验位）
- 日志记录和状态监控

## 技术栈

- Electron (主进程)
- Vue 3 + TypeScript (渲染进程)
- NestJS (主进程业务逻辑)
- Element Plus (UI 组件库)
- Pinia (状态管理)

## 安装依赖

```bash
npm install
```

## 开发模式

```bash
npm run dev
```

## 构建应用

### Windows 平台

```bash
npm run build:win
```

## 解决 serialport 原生模块问题

在 Electron 中使用 serialport 模块时可能会遇到原生模块构建问题。以下是解决该问题的步骤：

1. 确保使用正确的 Electron 版本进行重构：
   ```bash
   npx electron-rebuild -v 21.4.4 -w serialport -f
   ```

2. 在 `electron.vite.config.ts` 中添加以下配置：
   ```javascript
   export default defineConfig({
     main: {
       build: {
         rollupOptions: {
           external: ['serialport']
         }
       },
       optimizeDeps: {
         exclude: ['serialport']
       }
     }
   })
   ```

3. 如果仍然存在问题，可以手动运行重构命令：
   ```bash
   npm run rebuild
   ```

## 项目结构

```
src/
├── main/           # 主进程代码 (NestJS)
│   ├── ipc/        # IPC 处理程序
│   ├── nestjs/     # NestJS 模块和服务
│   └── main.ts     # 主进程入口
├── preload/        # 预加载脚本
└── renderer/       # 渲染进程代码 (Vue 3)
    ├── src/
    │   ├── views/  # 页面组件
    │   ├── stores/ # 状态管理
    │   └── router/ # 路由配置
    └── index.html  # 入口 HTML 文件
```

## 配置说明

应用会自动保存用户的配置信息，包括：
- 串口配置（端口、波特率等）
- HTTP 接口地址

配置文件存储在用户的数据目录中。

## 使用方法

1. 在"配置中心"页面选择合适的串口和参数
2. 设置目标 HTTP 接口地址
3. 点击"连接"按钮开始转发数据
4. 在"运行日志"页面查看实时状态和日志

## 注意事项

- 在某些 Windows 系统上可能需要管理员权限才能访问串口
- 确保目标 HTTP 接口可以正常访问
- 应用会在后台持续运行，直到手动关闭