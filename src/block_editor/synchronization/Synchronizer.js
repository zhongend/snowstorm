// Synchronizer：ChangeOrigin + Classic ↔ Block 双向同步 + 防抖。
// 防循环：origin 标记当前变更来源；block 写 Config 时 suppress classic 侧回调。
import { EditListeners } from '../../edits'
import { compileWorkspace, applyToConfig } from '../core/BlockCompiler'
import { decompileConfig } from '../core/BlockDecompiler'

class BlockSynchronizer {
	constructor() {
		this.mode = 'block'           // 'block' | 'classic'
		this.origin = 'system'        // 'block' | 'classic' | 'import' | 'system'
		this.workspace = null         // Blockly.Workspace（由 BlocklyWorkspace.vue 注入）
		this.loadJson = null          // (json) => Blockly.serialization.workspaces.load
		this.Config = null
		this.compileTimer = null
		this.status = { ok: true, errors: [] }
		this.onStatus = null
		this.onWorkspaceChange = null // BlockEditor 订阅拖动结束等事件
	}

	init(Config, workspace, loadJson) {
		this.Config = Config
		this.workspace = workspace
		this.loadJson = loadJson
		// Classic → Block：classic 输入 / 导入 / 预设最终都触发 registerEdit → EditListeners
		EditListeners.block_editor = () => {
			if (this.mode === 'block' && this.origin !== 'block') {
				this.decompileFromConfig()
			}
		}
	}

	setMode(mode) { this.mode = mode }

	// Block → Config（防抖 250ms）
	scheduleCompile() {
		if (this.compileTimer) clearTimeout(this.compileTimer)
		this.compileTimer = setTimeout(() => this.compileNow(), 250)
	}

	compileNow() {
		if (!this.workspace || !this.Config) return false
		this.origin = 'block'
		try {
			const result = compileWorkspace(this.workspace)
			const ok = applyToConfig(result, this.Config)
			this.status = { ok, errors: result.errors, kind: 'compiled' }
			if (this.onStatus) this.onStatus(this.status)
			return ok
		} finally {
			this.origin = 'system'
		}
	}

	// Config → Block（classic 模式修改 / 导入 / 预设后调用）
	decompileFromConfig() {
		if (!this.workspace || !this.Config || !this.loadJson) return
		try {
			const json = decompileConfig(this.Config)
			this.loadJson(json)
			this.status = { ok: true, errors: [], kind: 'synced' }
			if (this.onStatus) this.onStatus(this.status)
		} catch (err) {
			console.warn('[BlockEditor] decompile failed:', err)
		}
	}
}

export const Synchronizer = new BlockSynchronizer()
