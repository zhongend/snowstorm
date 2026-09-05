// BlockCompiler：Blockly Workspace → 遍历积木树 → 生成 Config 写入集（经校验后一次性应用）。
// 除模块语句栈外，还处理顶层定义积木：曲线（Config.curves）与事件（Config.events）。
// 严禁直接拼 Minecraft JSON —— 导出永远走 Snowstorm 原版 generateFile()。
import * as Blockly from 'blockly'
import { molangFromBlock, curveBlockToConfig } from '../molang/MolangBlocks'
import { ModuleRegistry } from '../blocks/modules'
import Data from '../../input_structure'

export class CompileResult {
	constructor() {
		this.writes = new Map()     // Config key → value
		this.curves = new Map()     // 'variable.xxx' → {mode, input, range, nodes}
		this.events = new Map()     // 事件 id → action 对象（particle_effect/sound_effect/expression）
		this.errors = []
		this.blockErrors = new Map()
	}
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
// ctx 存在时，曲线积木会被注册进 ctx.curves 并返回其变量名
export function evalValueInput(block, name, ctx) {
	const input = block.getInput(name)
	if (!input || !input.connection) return null
	const target = input.connection.targetBlock()
	if (!target) return null
	if (target.isShadow()) {
		// shadow 可能是数字（NUM）或变量下拉（VAR）等，取其第一个非空字段
		for (const row of target.inputList) {
			for (const field of row.fieldRow) {
				const v = target.getFieldValue(field.name)
				if (v !== '' && v !== undefined && v !== null) return v
			}
		}
		return null
	}
	if (target.type === 'molang_curve' && ctx) {
		return registerCurve(target, ctx)
	}
	return molangFromBlock(target, (n) => evalValueInput(target, n, ctx))
}

function registerCurve(block, ctx) {
	const result = curveBlockToConfig(block, (n) => evalValueInput(block, n, ctx))
	if (result.error) {
		ctx.warn(block, result.error)
		return block.getFieldValue('NAME') || '0'
	}
	ctx.curve(result.name, result.config)
	return result.name
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
		value(block, name) { return evalValueInput(block, name, ctx) },
		curve(name, cfg) { if (!result.curves.has(name)) result.curves.set(name, cfg) },
		event(id, action) { result.events.set(id, action) },
		warn(block, msg) { result.blockErrors.set(block.id, msg); result.errors.push(msg) },
	}

	// 校验：值槽既无 shadow 也无积木 → 必填错误（可选槽除外）
	function validate(block) {
		const def = defs.get(block.type)
		if (!def) return
		const optional = block.beOptional || []
		for (const input of block.inputList) {
			if (input.type !== Blockly.INPUT_VALUE) continue
			if (optional.includes(input.name)) continue
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

	// 顶层定义积木（曲线 / 事件定义）—— 不在语句栈里
	const seenCurves = new Set()
	for (const top of workspace.getTopBlocks()) {
		if (top.type === 'molang_curve') {
			const name = (top.getFieldValue('NAME') || '').trim()
			if (seenCurves.has(name)) {
				result.errors.push(`存在重复的曲线名 "${name}"`)
				result.blockErrors.set(top.id, `重复的曲线名 "${name}"`)
			}
			seenCurves.add(name)
			registerCurve(top, ctx)
		} else if (defs.get(top.type) && defs.get(top.type).topLevel) {
			const def = defs.get(top.type)
			try {
				def.compile(top, ctx)
			} catch (err) {
				result.blockErrors.set(top.id, String(err && err.message || err))
				result.errors.push(String(err && err.message || err))
			}
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
	// 曲线：积木定义的键覆盖写入，其余（如经典模式建的 bezier_chain）保留
	if (result.curves.size) {
		for (const [name, cfg] of result.curves) {
			Config.curves[name] = cfg
		}
	}
	// 事件：写入 Config.events，并镜像到经典事件列表（导出从这里读取）
	if (result.events.size) {
		for (const [id, action] of result.events) {
			Config.events[id] = action
			const list = Data_eventsList()
			const existing = list.find(e => e.id === id)
			if (existing) {
				existing.event = action
			} else {
				list.push({ uuid: 'be_event_' + id + '_' + list.length, id, event: action })
			}
		}
	}
	return true
}

function Data_eventsList() {
	if (!Data.events.events.events) Data.events.events.events = []
	return Data.events.events.events
}
