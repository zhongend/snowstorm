<template>
	<div class="block-editor">
		<div class="be-toolbar">
			<button class="run" @click="run">▶ 运行</button>
			<button class="export" @click="exportJson">⬇ 导出JSON</button>
			<button class="texture" @click="importTexture">📂 导入材质</button>
			<button class="samples" @click="loadSample">📃 加载示例 ({{ sampleName }})</button>
			<span class="spacer"></span>
			<MaterialPreviewPlaceholder />
		</div>
		<BlocklyWorkspace class="be-workspace" />
	</div>
</template>

<script>
import BlocklyWorkspace from './BlocklyWorkspace.vue'
import { View } from '../components/Preview'
import { downloadFile } from '../export'
import { loadPreset } from '../import'
import { Texture } from '../texture_edit'
import { Emitter } from '../emitter'
import { Synchronizer } from './synchronization/Synchronizer'

const SAMPLES = ['fire', 'snow', 'rain', 'drops', 'magic', 'rainbow', 'trail', 'billboard']

// 材质预览窗口（架构预留位，第一阶段为 Placeholder）
const MaterialPreviewPlaceholder = {
	name: 'MaterialPreviewPlaceholder',
	render(h) {
		return h('div', { class: 'material-preview', title: '材质预览窗口（预留）' }, [
			h('span', '材质预览'),
		])
	},
}

export default {
	name: 'BlockEditor',
	components: { BlocklyWorkspace, MaterialPreviewPlaceholder },
	data() {
		return { sampleIndex: 0 }
	},
	computed: {
		sampleName() { return SAMPLES[this.sampleIndex % SAMPLES.length] }
	},
	methods: {
		run() {
			// 编译积木 → Config，再重启原版播放控制
			Synchronizer.compileNow()
			View.PlaybackController.stop()
			View.PlaybackController.start()
		},
		exportJson() {
			// 必须先编译积木 → Config，再走 Snowstorm 原版导出（严禁直接拼 JSON）
			Synchronizer.compileNow()
			downloadFile()
		},
		importTexture() {
			// 复用原版 Texture 加载器（同 src/input.js image 输入的流程），不重做第二套
			const input = document.createElement('input')
			input.type = 'file'
			input.accept = 'image/*'
			input.onchange = (event) => {
				const file = event.target.files[0]
				if (!file) return
				const reader = new FileReader()
				reader.onloadend = () => {
					Texture.source = reader.result
					Texture.updateCanvasFromSource()
					Emitter.config.updateTexture()
				}
				reader.readAsDataURL(file)
			}
			input.click()
		},
		loadSample() {
			// 加载 Snowstorm 官方示例：原版 Import → Config → 自动反编译为积木
			Synchronizer.compileNow()
			loadPreset(SAMPLES[this.sampleIndex % SAMPLES.length])
			this.sampleIndex++
		},
	},
}
</script>

<style scoped>
.block-editor { display: flex; flex-direction: column; width: 100%; height: 100%; min-width: 0; }
.be-toolbar {
	display: flex; align-items: center; gap: 10px;
	padding: 8px 14px; background: #1e2735; border-bottom: 1px solid #10151d;
}
.be-toolbar button {
	display: inline-flex; align-items: center; gap: 6px;
	border: none; border-radius: 8px; padding: 7px 16px;
	font-size: 14px; font-weight: 600; color: #fff; cursor: pointer;
}
.be-toolbar .run { background: #e5484d; }
.be-toolbar .export { background: #d64072; }
.be-toolbar .texture { background: #3b5bdb; }
.be-toolbar .samples { background: #845ef7; }
.be-toolbar button:hover { filter: brightness(1.12); }
.be-toolbar .spacer { flex: 1; }
.material-preview {
	width: 220px; height: 42px; border: 1px dashed #5b6b82; border-radius: 8px;
	display: flex; align-items: center; justify-content: center;
	color: #8fa1ba; font-size: 12px;
}
.be-workspace { flex: 1; min-height: 0; }
</style>
