# Snowstorm 积木粒子编辑器

**在线演示：[zhongend.github.io/snowstorm](https://zhongend.github.io/snowstorm/)**（打开即默认积木模式）

在 [Snowstorm](https://snowstorm.app/)（JannisX11 开发的 Minecraft 基岩版粒子编辑器）基础上，新增了 **Scratch / TurboWarp 风格的积木式图形编程模式**：不用再对着表单填参数，像拼积木一样把发射器、运动、颜色、Molang 表达式"拼"出来，右侧 3D 预览实时变化，导出的 JSON 可直接放进 Minecraft 资源包使用。

![积木编辑器截图](docs/screenshot_block_editor.png)

## 新增了什么

- 🧩 **真正的积木编辑器**：基于 Google Blockly（Scratch 同款渲染风格），左侧分类 Toolbox、中间 Workspace、拖拽/吸附/嵌套/撤销/重做/复制/粘贴/缩放平移一应俱全
- 🔢 **Scratch 式数值槽**：所有参数槽带灰色 shadow 数字，点击即改；也可以把小积木拖进槽里替换
- 📐 **Molang 表达式积木化**：`sin(粒子年龄 × 90)` 不用写代码，拖 [正弦]、[粒子年龄]、[×] 三块积木拼出来；官方 43 个数学/缓动函数、13 个粒子/发射器变量、13 个运算符全部数据驱动注册
- 🔄 **双模式双向同步**：积木模式 ⇄ 传统模式随时切换，参数互通不丢失；JSON 导入导出与原版完全一致
- 🎥 **原版 3D 预览原样保留**：实时预览、材质、贴图、UV 系统零改动

![传统模式截图](docs/screenshot_classic_editor.png)

## 快速上手（积木模式）

1. 从左侧分类把 [发射器]、[运动] 等积木拖进 [粒子效果] 下方的竖槽
2. 点击积木上的圆圈数字直接改值；想加动画就把 [粒子年龄]、[正弦] 积木拖进数字槽
3. 顶栏：**▶运行** 重播 | **⬇导出JSON** 保存粒子文件 | **📂导入材质** 换贴图 | **📃加载示例** 一键看官方例子
4. 导出的 JSON 放进资源包 `particles/` 文件夹即可在游戏里引用

## 本地运行

```bash
npm install     # 安装依赖
npm run dev     # 开发服务器 localhost:3000
npm run production  # 生产构建
```

## 关于本 Fork

- 原项目：[JannisX11/snowstorm](https://github.com/JannisX11/snowstorm)，遵循 GPL-3.0 开源协议，感谢原作者的出色工作
- 本 Fork 的全部改动集中在 `src/block_editor/`（约 10 个文件），对原版代码的修改控制在最小范围（`App.vue` 模式切换 + `import.js` 一处导出）

---

# Snowstorm

(以下为原项目 README)


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
