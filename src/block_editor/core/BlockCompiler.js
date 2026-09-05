// BlockCompiler：Blockly Workspace → 遍历积木树 → 生成 Config 写入集（经校验后一次性应用）。
// 严禁直接拼 Minecraft JSON —— 导出永远走 Snowstorm 原版 generateFile()。
import * as Blockly from 'blockly'
import { molangFromBlock } from '../molang/MolangBlocks'
import { ModuleRegistry } from '../blocks/modules'

export class CompileResult {
	constructor() { this.writes = new Map(); this.errors = []; this.blockErrors = new Map() }
}

// 遍历 statement 链
function stackBlocks(rootBlock, stackName) {
	const list = []
	let cur = rootBlock.getInput(stackName) && rootBlock.getInput(stackName).connection.targetBlock()
	while (cur) {
		list.push(cur)
		cur = cur.getNextBlock()
	}
	return list
}

// 求值一个值输入槽：shadow → 字段数字；积木 → Molang 表达式字符串；空 → null
export function evalValueInput(block, name) {
	const input = block.getInput(name)
	if (!input || !input.connection) return null
	const target = input.connection.targetBlock()
	if (!target) return null
	if (target.isShadow()) {
		const v = target.getFieldValue('NUM')
		return (v === '' || v === undefined) ? null : v
	}
	return molangFromBlock(target, (n) => evalValueInput(target, n))
}

export function compileWorkspace(workspace) {
	const result = new CompileResult()
	const roots = workspace.getTopBlocks().filter(b => b.type === 'particle_effect')
	if (!roots.length) {
		result.errors.push('缺少 [粒子效果] 根积木 —— 尚未编译。')
		return result
	}
	const root = roots[0]
	const defs = new Map(ModuleRegistry.map(d => [d.type, d]))

	const ctx = {
		set(key, val) { result.writes.set(key, val) },
		value(block, name) { return evalValueInput(block, name) },
		warn(block, msg) { result.blockErrors.set(block.id, msg); result.errors.push(msg) },
	}

	// 校验：值槽既无 shadow 也无积木 → 必填错误
	function validate(block) {
		const def = defs.get(block.type)
		if (!def) return
		for (const input of block.inputList) {
			if (input.type !== Blockly.INPUT_VALUE) continue
			const target = input.connection && input.connection.targetBlock()
			if (!target) {
				result.blockErrors.set(block.id, `“${def.label || block.type}” 存在空的数值槽`)
				result.errors.push(`“${def.label || block.type}” 存在空的数值槽`)
			}
		}
	}

	const modules = stackBlocks(root, 'MODULES')
	result.writes.set('identifier', root.getFieldValue('IDENTIFIER'))
	for (const m of modules) {
		const def = defs.get(m.type)
		if (!def) continue
		validate(m)
		try {
			def.compile(m, ctx)
		} catch (err) {
			result.blockErrors.set(m.id, String(err && err.message || err))
			result.errors.push(String(err && err.message || err))
		}
	}
	// 模块缺席语义：碰撞积木不存在 = 关闭碰撞
	const present = new Set(modules.map(m => m.type))
	if (!present.has('collision')) result.writes.set('particle_collision_toggle', false)

	return result
}

// 把编译结果写入 Snowstorm Config（单一事实来源）。返回是否成功。
export function applyToConfig(result, Config) {
	if (!result || result.errors.length) return false
	for (const [key, value] of result.writes) {
		try {
			Config.set(key, value)
		} catch (err) {
			console.warn('[BlockEditor] Config.set failed:', key, value, err)
			return false
		}
	}
	return true
}
