// Molang 积木 —— 全部从 registries 数据自动生成（数据驱动，不手工散落）。
import { MolangVariables, MolangFunctions, MolangOperators, VariableCategories, FunctionCategories } from './registries'
import { parseMolang, parseNumeric, serializeMolang } from './MolangAST'

export const MOLANG_CHECK = 'MolangNumber'

function sanitized(name) { return name.replace(/[^a-z0-9]+/gi, '_') }

export function registerMolangBlocks(Blockly) {
	// 数字（可作为 shadow，Scratch 式点击覆盖）与 Raw Molang
	Blockly.defineBlocksWithJsonArray([{
		type: 'molang_number',
		message0: '%1',
		args0: [{ type: 'field_number', name: 'NUM', value: 0 }],
		output: MOLANG_CHECK,
		style: 'math_block',
		tooltip: '数字',
	}, {
		type: 'molang_raw',
		message0: 'Molang %1',
		args0: [{ type: 'field_input', name: 'EXPR', text: '' }],
		output: MOLANG_CHECK,
		style: 'molang_block',
		tooltip: '原始 Molang 表达式（无法用积木表达的复杂表达式）',
	}])

	// 变量积木（扁平下拉，按分类排序并以前缀分组显示）
	const varOptions = []
	for (const [cat, label] of Object.entries(VariableCategories)) {
		for (const v of MolangVariables.filter(v => v.category === cat)) {
			varOptions.push([`${v.display}`, v.name])
		}
	}
	Blockly.defineBlocksWithJsonArray([{
		type: 'molang_var',
		message0: '%1',
		args0: [{ type: 'field_dropdown', name: 'VAR', options: varOptions }],
		output: MOLANG_CHECK,
		style: 'variable_blocks',
		tooltip: 'Molang 变量',
	}])

	// 运算符积木（Scratch 式：dropdown 选 + - × ÷ % 比较 逻辑）
	Blockly.defineBlocksWithJsonArray([{
		type: 'molang_op',
		message0: '%1 %2 %3',
		args0: [
			{ type: 'input_value', name: 'A', check: MOLANG_CHECK },
			{ type: 'field_dropdown', name: 'OP', options: MolangOperators.map(o => [o.symbol, o.name]) },
			{ type: 'input_value', name: 'B', check: MOLANG_CHECK },
		],
		output: MOLANG_CHECK,
		style: 'operator_blocks',
		inputsInline: true,
		tooltip: '运算',
	}, {
		type: 'molang_conditional',
		message0: '如果 %1 那么 %2 否则 %3',
		args0: [
			{ type: 'input_value', name: 'COND', check: MOLANG_CHECK },
			{ type: 'input_value', name: 'THEN', check: MOLANG_CHECK },
			{ type: 'input_value', name: 'ELSE', check: MOLANG_CHECK },
		],
		output: MOLANG_CHECK,
		style: 'operator_blocks',
		inputsInline: true,
		tooltip: 'Molang 三元条件 cond ? a : b',
	}])

	// 曲线积木：编译时注册进 Config.curves，输出变量名供其他槽引用
	Blockly.Blocks.molang_curve = {
		init() {
			this.appendDummyInput().appendField('曲线')
				.appendField(new Blockly.FieldTextInput('variable.my_curve'), 'NAME')
				.appendField(new Blockly.FieldDropdown([
					['线性', 'linear'], ['Catmull Rom', 'catmull_rom'], ['贝塞尔', 'bezier'],
				]), 'MODE')
				.appendField('节点')
				.appendField(new Blockly.FieldTextInput('0, 1, 0'), 'NODES')
			this.appendValueInput('INPUT').setAlign(Blockly.inputs.Align.RIGHT).appendField('输入').setCheck(MOLANG_CHECK)
			this.appendValueInput('RANGE').setAlign(Blockly.inputs.Align.RIGHT).appendField('范围').setCheck(MOLANG_CHECK)
			this.setOutput(true, MOLANG_CHECK)
			this.setStyle('curve_block')
			this.setTooltip('定义一条曲线并输出其变量名。节点为逗号分隔的数值；输入/范围是把横向进度映射到节点的 Molang（默认 粒子年龄 / 粒子寿命）')
		}
	}

	// 函数积木：数据驱动生成（含 30 个 easing）
	for (const fn of MolangFunctions) {
		const type = 'molang_fn_' + sanitized(fn.name)
		Blockly.Blocks[type] = {
			init() {
				this.appendDummyInput().appendField(fn.display)
				for (let i = 0; i < fn.args; i++) {
					this.appendValueInput('ARG' + i).setCheck(MOLANG_CHECK)
				}
				if (fn.args > 1) this.setInputsInline(true)
				this.setOutput(true, MOLANG_CHECK)
				this.setStyle('molang_fn_block')
				this.setTooltip(fn.name)
			}
		}
	}
}

// 曲线积木 → {name, config}；非法时返回 {error}
export function curveBlockToConfig(block, evalInput) {
	const name = (block.getFieldValue('NAME') || '').trim()
	const mode = block.getFieldValue('MODE')
	const nodes = (block.getFieldValue('NODES') || '').split(',').map(s => parseFloat(s)).filter(n => isFinite(n))
	if (!name.startsWith('variable.')) return { error: `曲线名 "${name}" 必须以 variable. 开头` }
	const minNodes = mode === 'bezier' ? 4 : 2
	if (nodes.length < minNodes) return { error: `曲线 "${name}" 至少需要 ${minNodes} 个节点数值` }
	return {
		name,
		config: {
			mode,
			input: evalInput ? evalInput('INPUT') : 'variable.particle_age',
			range: evalInput ? evalInput('RANGE') : 'variable.particle_lifetime',
			nodes,
		},
	}
}

export function molangCurveType() { return 'molang_curve' }

// ---------- 编译：积木 → Molang 字符串 ----------
// evalInput(name) 由 BlockCompiler 提供：取输入槽内积木的表达式（或 shadow 字段值）
export function molangFromBlock(block, evalInput) {
	switch (block.type) {
		case 'molang_number':
			return String(block.getFieldValue('NUM'))
		case 'molang_raw':
			return block.getFieldValue('EXPR') || '0'
		case 'molang_var':
			return block.getFieldValue('VAR')
		case 'molang_op': {
			const op = MolangOperators.find(o => o.name === block.getFieldValue('OP'))
			return `(${evalInput('A')} ${op.molang} ${evalInput('B')})`
		}
		case 'molang_conditional':
			return `(${evalInput('COND')} ? ${evalInput('THEN')} : ${evalInput('ELSE')})`
		default:
			if (block.type.startsWith('molang_fn_')) {
				const fn = MolangFunctions.find(f => 'molang_fn_' + sanitized(f.name) === block.type)
				if (!fn) return '0'
				if (fn.args === 0) return fn.name
				const args = Array.from({ length: fn.args }, (_, i) => evalInput('ARG' + i))
				return `${fn.name}(${args.join(',')})`
			}
			return null
	}
}

// ---------- 反编译：Molang AST → Blockly JSON（可被 Blockly.serialization.load 使用） ----------
function astToBlockJson(ast) {
	switch (ast.type) {
		case 'number':
			return { type: 'molang_number', fields: { NUM: ast.value } }
		case 'variable': {
			const known = MolangVariables.find(v => v.name === ast.name)
			return known
				? { type: 'molang_var', fields: { VAR: ast.name } }
				: { type: 'molang_raw', fields: { EXPR: ast.name } }
		}
		case 'unary': // 一元负号 → (0 - x)
			return {
				type: 'molang_op', fields: { OP: 'sub' },
				inputs: { A: { type: 'molang_number', fields: { NUM: 0 } }, B: astToBlockJson(ast.arg) },
			}
		case 'binary': {
			const op = MolangOperators.find(o => o.molang === ast.op)
			return {
				type: 'molang_op',
				fields: { OP: op ? op.name : 'add' },
				inputs: { A: astToBlockJson(ast.left), B: astToBlockJson(ast.right) },
			}
		}
		case 'conditional':
			return {
				type: 'molang_conditional',
				inputs: { COND: astToBlockJson(ast.cond), THEN: astToBlockJson(ast.then), ELSE: astToBlockJson(ast.else) },
			}
		case 'call': {
			const fn = MolangFunctions.find(f => f.name === ast.fn)
			if (!fn) return { type: 'molang_raw', fields: { EXPR: serializeSafe(ast) } }
			if (fn.args === 0) return { type: 'molang_raw', fields: { EXPR: ast.fn } }
			const inputs = {}
			for (let i = 0; i < fn.args; i++) inputs['ARG' + i] = astToBlockJson(ast.args[i] || { type: 'number', value: 0 })
			return { type: 'molang_fn_' + sanitized(fn.name), inputs }
		}
		default:
			return { type: 'molang_raw', fields: { EXPR: serializeSafe(ast) } }
	}
}

function serializeSafe(node) {
	return serializeMolang(node)
}

// Molang 字符串 → Blockly JSON 树；失败 → null（调用方回退 raw block）
export function molangToBlockJson(src) {
	if (src === null || src === undefined || src === '') return null
	const num = parseNumeric(src)
	if (num !== null) return { type: 'molang_number', fields: { NUM: num } }
	const ast = parseMolang(src)
	if (!ast) return null
	if (ast.type === 'number') return { type: 'molang_number', fields: { NUM: ast.value } }
	return astToBlockJson(ast)
}

export { sanitized as sanitizeMolangName }
