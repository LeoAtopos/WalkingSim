# 李欧丁（Leo Ding）的走路模拟器

一款程序化低多边形风格的 3D Web Game。玩家在无限延伸的城市街道中与人群同行，通过五档速度完成观察任务，经历轻微或猛烈碰撞，最后回到李欧丁面前作出评价。

## 运行

```bash
npm install
npm run dev
```

浏览器打开终端中显示的本地地址。生产构建使用：

```bash
npm run build
npm run preview
```

## 操作

- `W` / `↑`：提高一档速度
- `S` / `↓`：降低一档速度
- `F`：切换全屏
- 触屏设备可使用左下角的 `−` / `＋` 按钮

技术栈：Vite、TypeScript、Three.js、Rapier 3D。所有街景、角色和特效均由运行时代码程序化生成，不依赖外部美术资源。

游戏会读取浏览器首选语言：中文浏览器显示中文，其余浏览器显示英文。

## 发布构建

```bash
npm run build:itch
npm run build:pages
```

- `foritch/`：使用相对资源路径，可直接作为 itch.io HTML 游戏上传内容；目录保持未打包状态。
- `forpages/`：使用相对资源路径，可部署到任意 GitHub Pages 仓库子路径。
