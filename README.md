# ST-Full-screen

SillyTavern 全屏插件 — 让聊天界面占满整个屏幕，获得沉浸式体验。

## ✨ 功能

- **原生全屏**：调用浏览器 Fullscreen API，隐藏浏览器标题栏、地址栏和系统任务栏
- **CSS 布局全屏**：隐藏 SillyTavern 顶栏和侧边面板，聊天区域铺满浏览器窗口
- **键盘快捷键**：`Ctrl+Shift+F` 切换全屏，`Esc` 退出
- **移动端适配**：支持 Safe Area、`dvw`/`dvh` 动态视口单位、系统返回键退出
- **小窗恢复**：移动端切换小窗或后台后，返回时自动重新进入全屏
- **可配置**：所有功能均可在扩展设置页中独立开关

## 📦 安装

### 方式一：通过 SillyTavern 扩展安装器

1. 打开 SillyTavern → 扩展 → 安装扩展
2. 输入本仓库地址：
   ```
   https://github.com/Youzini-afk/ST-Full-screen
   ```
3. 点击安装，刷新页面

### 方式二：手动安装

1. 将本仓库克隆到 SillyTavern 的第三方扩展目录：
   ```bash
   cd <SillyTavern>/public/scripts/extensions/third-party
   git clone https://github.com/Youzini-afk/ST-Full-screen.git
   ```
2. 重启 SillyTavern

## 🎮 使用

1. 点击发送栏左侧的 **魔杖按钮**（✨）
2. 点击 **「🖥️ 全屏」**

退出方式：
- 再次点击「🖥️ 全屏」按钮
- 按 `Esc` 键
- 按 `Ctrl+Shift+F`
- 移动端按系统返回键

## ⚙️ 设置

在 SillyTavern 的 **扩展设置页** 中找到 **「🖥️ 全屏模式」** 面板：

| 选项 | 说明 | 默认 |
|---|---|---|
| 启用 CSS 布局全屏 | 隐藏面板，聊天区铺满窗口 | 关 |
| 启用原生全屏 | 隐藏浏览器/系统 UI | 开 |
| 切换小窗时保持全屏 | 页面恢复可见时自动重新请求全屏 | 开 |
| 键盘快捷键 | 启用 Ctrl+Shift+F | 开 |

## 📝 License

MIT
