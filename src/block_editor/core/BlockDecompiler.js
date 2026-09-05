// BlockDecompiler：Snowstorm Config → Blockly Workspace JSON。
// 数字 → shadow 数字积木；Molang 字符串 → Molang AST → 表达式积木树；
// 无法解析 → molang_raw 原始表达式积木（不丢数据）。
// 未被积木覆盖的 Config 字段保持原样（round-trip 不丢数据）。
import { ModuleRegistry } from '../blocks/modules'
import { molangToBlockJson } from '../molang/MolangBlocks'

let uid = 0
function nextId() { return 'be' + (uid++) }

export function decompileConfig(Config) {
	// 1) 按注册表顺序反编译各模块
	const chain = []
	for (const def of ModuleRegistry) {
		if (def.type === 'particle_effect') continue
		if (def.topLevel) continue
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

	// 4) 顶层定义积木：曲线（bezier_chain 无法用积木表达，保留在 Config 不生成）
	const extras = []
	const shadowOrBlock = (v, fallback) => {
		const json = molangToBlockJson(v === undefined || v === null || v === '' ? fallback : v)
		if (!json) return { shadow: { type: 'molang_number', fields: { NUM: 0 } } }
		if (json.type === 'molang_number') return { shadow: { type: 'molang_number', fields: { NUM: json.fields.NUM } } }
		return { block: json }
	}
	for (const name in Config.curves) {
		const c = Config.curves[name]
		if (!c || c.mode === 'bezier_chain') continue
		const nodesText = (c.nodes || []).map(n => typeof n == 'object' ? (n.left_value ?? 0) : n).join(', ')
		extras.push({
			type: 'molang_curve', id: nextId(), x: 620, y: 40 + extras.length * 150,
			fields: { NAME: name, MODE: c.mode || 'linear', NODES: nodesText },
			inputs: { INPUT: shadowOrBlock(c.input, 'variable.particle_age'), RANGE: shadowOrBlock(c.range, 'variable.particle_lifetime') },
		})
	}
	// 5) 事件定义积木（randomize/sequence 等复杂事件保留在 Config，不生成）
	const events = Config.events || {}
	for (const id in events) {
		const ev = events[id]
		if (!ev || ev.randomize || ev.sequence) continue
		const actions = []
		if (ev.particle_effect) {
			const arr = Array.isArray(ev.particle_effect) ? ev.particle_effect : [ev.particle_effect]
			arr.forEach(a => actions.push({ type: 'event_spawn_particle', fields: { ID: id, EFFECT: a.effect || a.effect_name || '', TYPE: a.type || 'emitter' } }))
		}
		if (ev.sound_effect) {
			const arr = Array.isArray(ev.sound_effect) ? ev.sound_effect : [ev.sound_effect]
			arr.forEach(a => actions.push({ type: 'event_play_sound', fields: { ID: id, SOUND: a.event_name || '' } }))
		}
		if (ev.expression !== undefined) {
			const expr = Array.isArray(ev.expression) ? ev.expression.join('\n') : String(ev.expression)
			actions.push({ type: 'event_run_expression', fields: { ID: id, EXPR: expr } })
		}
		actions.forEach((a, i) => extras.push({ type: a.type, id: nextId(), x: 960, y: 40 + i * 150, fields: a.fields }))
	}

	// Blockly workspace state 形如 { blocks: {languageVersion, blocks: [...]} }
	return { blocks: { languageVersion: 0, blocks: [root].concat(extras) } }
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
