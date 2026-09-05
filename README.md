# Snowstorm 积木粒子编辑器

**在线演示：[zhongend.github.io/snowstorm](https://zhongend.github.io/snowstorm/)**（打开即默认积木模式）

本仓库是 [Snowstorm](https://snowstorm.app/)（原作者 [JannisX11](https://github.com/JannisX11)）的 Fork：在完整保留原版编辑能力与实时 3D 预览的基础上，新增了 **Scratch / TurboWarp 风格的积木式图形编程模式**——像拼积木一样"拼"出粒子效果，导出的 JSON 可直接放进 Minecraft 基岩版资源包。

![积木编辑器截图](docs/screenshot_block_editor.png)

## 积木模式（Fork 新增）

| 分类 | 能做什么 |
| --- | --- |
| 🟦 粒子控制 / 发射器 | 稳定/瞬时/手动发射，速率、最大粒子数，循环/单次/表达式寿命 |
| 🟩 发射形状 / 寿命 | 点、球体、立方体、圆盘、实体包围盒；粒子最大寿命、消亡条件、击杀平面、触碰方块消失 |
| 🟧 运动 / 旋转 | 动态与参数化两种模式，初速度、加速度、阻力、旋转全参数 |
| 🟪 外观 / 颜色 | 尺寸、材质、11 种摄像头朝向、方向来源；固定颜色、渐变、RGBA 表达式 |
| 🟫 材质/UV | 静态/全图/逐帧动画，UV 偏移、步进、帧率、循环 |
| ⬜ 碰撞 / 粒子空间 | 碰撞箱、弹性、碰撞后消失；实体空间模拟开关 |
| 🔴 事件 | 定义事件（生成子粒子/播放声音/运行表达式）并按生成/结束/时间线/飞行距离触发 |
| 🟡 曲线 | 线性/Catmull Rom/贝塞尔曲线，输出变量名可插入任意数值槽 |
| ⬛ 高级 | 初始/每帧变量、粒子更新表达式、粒子渲染表达式 |
| 🟠 Molang | 官方 13 个粒子变量、43 个数学与缓动函数、13 个运算符，中文名积木化 |

把 [粒子年龄]、[正弦] 这类小积木拖进任何数字槽，就能拼出 `math.sin((variable.particle_age*90))` 这样的官方表达式，预览实时变化；无法用积木表达的复杂语句自动放入"原始 Molang"积木，数据不丢失。

积木模式与传统模式操作同一份数据，随时切换、双向同步；JSON 导入导出与原版完全一致。

## Contributors 贡献者

| 贡献者 | 主要贡献 |
| --- | --- |
| [zhongend](https://github.com/zhongend) | 积木编辑器整体设计与实现（Blockly 工作区 / 编译器 / 反编译器 / Molang 层） |
| [oldwu2333](https://github.com/oldwu2333)（隔壁的老吴鸦） | 项目协作者、需求与测试 |

## 更新日志

- **v1.1** 高阶功能：曲线积木、事件系统（定义+触发）、粒子寿命模块、变量/更新/渲染表达式、外观方向来源
- **v1.0** 积木编辑器发布：Blockly 工作区 + 模块积木 + Molang 积木化 + 双向同步

---

以下为原项目 README：

# Snowstorm

Custom editor for Minecraft Bedrock Edition particle files. Available as a web app and VSCode Extension:
* **Web App:** [snowstorm.app](https://snowstorm.app/)
* **VSCode Extension:** [Snowstorm - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=JannisX11.snowstorm)


## Interface

![Snowstorm interface screenshot](https://snowstorm.app/content/interface.png)


## Development

1. Install node and run `npm install` to install all dependencies

2. Run `npm run watch` to run the bundler and update whenever you change anything

3. Open the app

	#### Web app:

	Use your preferred local server to host the app (npx serve, xampp, etc.), and open it in your browser

	#### VS Code Extension:

	Press F5 to run the Extension Development Host in a new VS Code instance
