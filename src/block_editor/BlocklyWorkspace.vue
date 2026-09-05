<template>
	<div class="blockly-wrap">
		<div class="blockly-toolbar">
			<input class="blockly-search" type="text" v-model="search" placeholder="搜索积木（中文/英文，如 速度、sin、random）" />
			<span class="status" :class="{err: !statusOk}">{{ statusText }}</span>
			<button @click="undo" title="撤销 (Ctrl+Z)">↶ 撤销</button>
			<button @click="redo" title="重做 (Ctrl+Y)">↷ 重做</button>
			<button @click="zoomFit">适应窗口</button>
			<button @click="compileNow" title="立即把积木编译进 Snowstorm">⟳ 编译</button>
		</div>
		<div class="blockly-host" ref="host"></div>
	</div>
</template>

<script>
import * as Blockly from 'blockly'
import { registerMolangBlocks } from './molang/MolangBlocks'
import { registerModuleBlocks } from './blocks/modules'
import { createTheme } from './theme/SnowstormBlocklyTheme'
import { buildToolbox, searchToolbox } from './toolbox/toolbox'
import { Synchronizer } from './synchronization/Synchronizer'
import { Config } from '../emitter'
import { generateFile } from '../export'
import { loadFile } from '../import'

// Blockly 图标资源基准路径：以加载的 app.js 所在目录为准（主站 dist/、VSCode 扩展目录均适用）
function resolveMediaBase() {
	try {
		const script = document.querySelector('script[src$="app.js"]')
		if (script && script.src) return new URL('media/', script.src).href
	} catch (err) { /* 回退到页面相对路径 */ }
	return 'dist/media/'
}

export default {
	name: 'BlocklyWorkspace',
	data() {
		return { search: '', statusOk: true, statusText: '积木已就绪' }
	},
	watch: {
		search(kw) {
			if (this.ws) this.ws.updateToolbox(searchToolbox(kw))
		}
	},
	mounted() {
		// 注册积木与主题（幂等）
		registerMolangBlocks(Blockly)
		registerModuleBlocks(Blockly)
		const theme = createTheme()

		this.ws = Blockly.inject(this.$refs.host, {
			media: resolveMediaBase(),
			toolbox: buildToolbox(),
			theme,
			grid: { spacing: 28, length: 3, colour: '#d9dfe7', snap: true },
			zoom: { controls: true, wheel: true, startScale: 0.9, minScale: 0.3, maxScale: 2.5, pinch: true },
			trashcan: true,
			move: { scrollbars: true, drag: true, wheel: true },
			sounds: false,
			renderer: 'zelos',   // Scratch 圆角风格渲染器
		})

		// 同步器注入
		Synchronizer.init(Config, this.ws, (json) => {
			Blockly.serialization.workspaces.load(json, this.ws)
		})
		Synchronizer.onStatus = (status) => {
			this.statusOk = status.ok
			this.statusText = status.ok
				? (status.kind === 'synced' ? '与 Snowstorm Config 同步 ✓' : '已编译进 Snowstorm ✓')
				: ('⚠ ' + status.errors[0])
		}

		// Workspace 变化 → 编译（拖动中由 Blockly 内部处理，change 事件节流 + debounce）
		this.ws.addChangeListener((event) => {
			if (!event) return
			if (event.type === Blockly.Events.BLOCK_MOVE || event.type === Blockly.Events.BLOCK_CHANGE
				|| event.type === Blockly.Events.BLOCK_DELETE || event.type === Blockly.Events.BLOCK_CREATE
				|| event.type === Blockly.Events.BLOCK_FIELD_INTERMEDIATE_CHANGE) {
				Synchronizer.scheduleCompile()
			}
		})

		// 初始反编译（从当前 Config 生成积木）
		Synchronizer.decompileFromConfig()

		// 调试钩子（控制台可用 window.__BlockEditor 复现问题）
		window.__BlockEditor = {
			Synchronizer, Blockly, ws: () => this.ws,
			load(json) { return Blockly.serialization.workspaces.load(json, this.ws) },
			save() { return Blockly.serialization.workspaces.save(this.ws) },
			generateFile, loadFile,
		}
	},
	beforeDestroy() {
		if (this.ws) { this.ws.dispose(); this.ws = null }
	},
	methods: {
		undo() { this.ws.undo(false) },
		redo() { this.ws.undo(true) },
		zoomFit() { this.ws.zoomToFit() },
		compileNow() { Synchronizer.compileNow() },
	},
}
</script>

<style scoped>
.blockly-wrap { display: flex; flex-direction: column; width: 100%; height: 100%; }
.blockly-toolbar {
	display: flex; align-items: center; gap: 8px;
	padding: 6px 10px; background: #ffffff; border-bottom: 1px solid #dfe3ea;
}
.blockly-search {
	flex: 0 1 340px; padding: 5px 10px; border: 1px solid #dfe3ea; border-radius: 8px;
	font-size: 13px; outline: none;
}
.blockly-search:focus { border-color: #4C97FF; }
.status { font-size: 12px; color: #2f9e44; margin-left: auto; }
.status.err { color: #e03131; }
.blockly-toolbar button {
	border: 1px solid #dfe3ea; background: #f7f9fc; border-radius: 8px;
	padding: 4px 12px; font-size: 12px; cursor: pointer;
}
.blockly-toolbar button:hover { background: #eef2f8; }
.blockly-host { flex: 1; min-height: 0; }
</style>
