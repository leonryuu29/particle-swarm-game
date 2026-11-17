# Particle Swarm - Technical Documentation

Copyright@2023020213 Yuzhaoze
leonryuu29@gmail.com
# Particle Swarm - 技术文档

## 1. 项目概述

`Particle Swarm` 是一款基于 Phaser 3 游戏引擎开发的2D网页游戏。玩家不直接控制单一角色，而是通过在屏幕上设置“引力点”和“斥力点”来影响一个粒子群的整体移动。玩家可以通过鼠标左键和右键分别设置引力点斥力点。游戏的目标是引导粒子群收集食物粒子、获取能量道具、躲避危险，并尽可能获得更高的分数。当所有粒子都消失时，游戏结束。

本项目旨在探索非传统的玩家控制机制，并利用Phaser引擎的物理和粒子系统，创造出动态且富有视觉吸引力的游戏体验。

## 2. 技术栈

*   **游戏引擎**: [Phaser 3](https://phaser.io/phaser3) (v3.55.2)
*   **编程语言**: JavaScript (ES6 Modules)
*   **运行环境**: 现代网页浏览器 (Chrome, Firefox, etc.)
*   **核心技术**:
    *   **Phaser Arcade Physics**: 用于处理所有游戏对象（食物粒子、食物、危险区域）的物理模拟、碰撞检测和响应。
    *   **Phaser Particle Emitter**: 用于创建各种视觉特效，如粒子尾迹、爆炸效果和能量道具的动态光晕。
    *   **Phaser Scene Management**: 用于管理游戏的不同状态（主菜单、游戏场景、UI界面）。
    *   **HTML5/CSS3**: 用于构建游戏的基本页面框架和样式。
    *   **HTML5 `localStorage`**: 用于在本地持久化存储玩家的最高分记录。

## 3. 项目结构

项目采用模块化的场景管理方式，结构清晰，易于维护。



### 3.1. 文件层级说明

*   **`index.html`**: 游戏的主入口页面。它负责引入Phaser框架和作为模块加载的主游戏文件 `game.js`。
*   **`game.js`**: Phaser游戏实例的配置文件。它定义了游戏的全局设置，如渲染类型、窗口尺寸、物理引擎配置，并注册了项目中所有的场景 (`MainMenuScene`, `GameScene`, `UIScene`)。
*   **`js/scenes/`**: 存放游戏所有场景逻辑的目录。
    *   **`MainMenuScene.js`**: 负责显示游戏标题、最高分和“开始游戏”按钮。它还处理背景音乐的播放和全局资源的预加载（如粒子纹理）。
    *   **`GameScene.js`**: 这是游戏的核心，包含了绝大部分的游戏逻辑。它管理着玩家的粒子群、食物、危险区域、能量道具的生成与交互，处理玩家的鼠标输入，并根据物理规则更新游戏世界。
    *   **`UIScene.js`**: 作为一个独立的场景与 `GameScene` 并行运行。它专门负责渲染所有UI元素，如分数、粒子数量、护盾状态、游戏结束菜单等。它通过Phaser的事件系统与 `GameScene` 通信，以响应游戏状态的变化。

## 4. 核心功能与实现细节

### 4.1. 场景管理 (Scene Management)

游戏利用Phaser强大的场景系统将不同功能解耦。

*   **启动流程**: `MainMenuScene` 作为启动场景。当玩家点击“Start Game”后，它会停止自身并启动 `GameScene`。
*   **并行场景**: `GameScene` 在其 `create` 方法的最后，会使用 `this.scene.launch('UIScene')` 来启动 `UIScene`。`launch` 使得 `UIScene` 可以与 `GameScene` 同时运行，非常适合做UI覆盖层。
*   **场景通信**: `GameScene` 通过 `this.events.emit('eventName', ...)` 来广播事件（如 `addScore`, `gameOver`）。`UIScene` 则通过 `this.gameScene.events.on('eventName', ...)` 来监听这些事件，并更新UI显示。
*   **场景切换与重启**:
    *   **返回主菜单**: `UIScene` 中的“Quit”和“Main Menu”按钮会先停止 `GameScene`，并监听其 `shutdown` 事件。一旦 `GameScene` 完全关闭，`UIScene` 才会停止自己并启动 `MainMenuScene`，确保了场景切换的稳定。
    *   **游戏重启**: “Restart”按钮会直接调用 `this.scene.get('GameScene').scene.restart()` 来重启游戏场景，并停止当前的 `UIScene`。`GameScene` 重启后会再次 `launch` 一个新的 `UIScene`。

### 4.2. 玩家控制与粒子物理

*   **影响力系统**: 玩家通过鼠标左键创建“引力点”，右键创建“斥力点”。这些点被存储在 `GameScene` 的 `influence_points` 数组中。
*   **物理模拟**: 在 `GameScene` 的 `update` 循环中，会遍历每一个粒子。对于每个粒子，又会遍历所有的影响力点，根据距离和类型（引力/斥力）计算出一个合力，并将其施加在粒子的 `body.acceleration` 上。
    *   **引力**: `F = k * distance`，力的大小与距离成正比，但设有上限以防止粒子速度过快。
    *   **斥力**: `F = k / distance²`，力的大小与距离的平方成反比，模拟了真实的点状斥力源。
*   **粒子行为**: 粒子被设置为在世界边界内反弹，并具有一定的阻尼 (`drag`)，使其运动更自然。当没有影响力点时，粒子会进行小范围的随机运动。

### 4.3. 游戏元素与交互

*   **食物 (Food)**: 周期性地以不同阵型（圆形、线形）生成。粒子与食物重叠时，食物被“吃掉”，玩家得分，并触发一个小的爆炸特效。
*   **危险区域 (Hazard)**: 随机分布在场上。当粒子（在无护盾状态下）撞击危险区域时，粒子会被摧毁，并触发镜头震动和爆炸特效。危险区域会在被撞击后短暂消失，然后在别处重生。
*   **能量道具 (Power-ups)**:
    *   **护盾 (`shield_powerup`)**: 拾取后，所有粒子在一定时间内免疫危险区域的伤害。`UIScene` 会显示护盾的开启状态和倒计时。
    *   **增援 (`reinforcement_powerup`)**: 拾取后，会立即在拾取位置生成大量新的粒子，并奖励分数。

### 4.4. 资源管理与性能

*   **动态纹理生成**: 游戏中的许多基本图形（如粒子、食物、危险区域）不是通过加载图片文件，而是使用 `this.make.graphics()` 在代码中动态生成并缓存为纹理。这减少了HTTP请求，并使得调整这些元素的外观变得非常容易。
*   **资源清理**: 每个场景都在其 `shutdown` 方法中精确地清理自己创建的资源，如定时器 (`this.time.addEvent`)、事件监听器 (`this.events.off`)、物理组和粒子发射器。这对于防止内存泄漏和在场景重启/切换时发生错误至关重要。

## 5. 如何运行

1.  确保你有一个本地Web服务器环境（例如使用 VS Code 的 `Live Server` 插件）。
2.  将整个项目文件夹放置在服务器的根目录下。
3.  在浏览器中访问 `index.html`。
