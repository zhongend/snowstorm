// BlockDecompiler：Snowstorm Config → Blockly Workspace JSON。
// 数字 → shadow 数字积木；Molang 字符串 → Molang AST → 表达式积木树；
// 无法解析 → molang_raw 原始表达式积木（不丢数据）。
// 未被积木覆盖的 Config 字段保持原样（round-trip 不丢数据）。
import { ModuleRegistry } from '../blocks/modules'

let uid = 0
function nextId() { return 'be' + (uid++) }

export function decompileConfig(Config) {
	// 1) 按注册表顺序反编译各模块
	const chain = []
	for (const def of ModuleRegistry) {
		if (def.type === 'particle_effect') continue
		let data = null
		try { data = def.decompile ? def.decompile(Config) : null } catch (err) { console.warn('[Decompiler]', def.type, err) }
		if (!data) continue
		const blockJson = { type: def.type, id: nextId(), fields: {}, inputs: {} }
		for (const [k, v] of Object.entries(data.fields || {})) if (v !== undefined) blockJson.fields[k] = v
		for (const [k, v] of Object.entries(data.inputs || {})) if (v) blockJson.inputs[k] = v
		chain.push(blockJson)
	}
	// 2) statement 链：从尾到头挂 next
	for (let i = chain.length - 2; i >= 0; i--) chain[i].next = { block: chain[i + 1] }

	// 3) 根积木
	const root = {
		type: 'particle_effect',
		id: nextId(),
		x: 40, y: 40,
		fields: { IDENTIFIER: Config.identifier || 'custom:fire_particle' },
	}
	if (chain.length) root.inputs = { MODULES: { block: chain[0] } }

	// Blockly workspace state 形如 { blocks: {languageVersion, blocks: [...]} }
	return { blocks: { languageVersion: 0, blocks: [root] } }
}

// 空白 workspace（仅根积木）
export function emptyWorkspace(identifier = 'custom:fire_particle') {
	return {
		blocks: {
			languageVersion: 0,
			blocks: [{
				type: 'particle_effect', id: nextId(), x: 40, y: 40,
				fields: { IDENTIFIER: identifier },
			}],
		},
	}
}
