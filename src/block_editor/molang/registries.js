// Molang Registry — 数据驱动。
// 数据来源：官方 Molang Math Functions / Particle Molang Integration 文档（见 MOLANG_ANALYSIS.md）
// 以及 Snowstorm src/molang_data.js 的 DefaultVariables / MathFunctions。
// 积木与 Toolbox 均从此注册表自动生成，禁止在别处手工散落 Molang 名称。

export const MolangVariables = [
	// 粒子变量
	{ name: 'variable.particle_age',       display: '粒子年龄',      category: 'particle', doc: '粒子已存活时间' },
	{ name: 'variable.particle_lifetime',  display: '粒子寿命',      category: 'particle', doc: '粒子的总寿命' },
	{ name: 'variable.particle_random_1',  display: '粒子随机值 1',  category: 'particle_random', doc: '粒子生命周期内恒定的随机值 (0..1)' },
	{ name: 'variable.particle_random_2',  display: '粒子随机值 2',  category: 'particle_random', doc: '粒子生命周期内恒定的随机值 (0..1)' },
	{ name: 'variable.particle_random_3',  display: '粒子随机值 3',  category: 'particle_random', doc: '粒子生命周期内恒定的随机值 (0..1)' },
	{ name: 'variable.particle_random_4',  display: '粒子随机值 4',  category: 'particle_random', doc: '粒子生命周期内恒定的随机值 (0..1)' },
	// 发射器变量
	{ name: 'variable.emitter_age',        display: '发射器年龄',    category: 'emitter', doc: '发射器当前循环开始以来的年龄' },
	{ name: 'variable.emitter_lifetime',   display: '发射器寿命',    category: 'emitter', doc: '发射器当前循环的时长' },
	{ name: 'variable.entity_scale',       display: '实体缩放',      category: 'emitter', doc: '附加到实体时的实体缩放' },
	{ name: 'variable.emitter_random_1',   display: '发射器随机值 1', category: 'emitter_random', doc: '发射器当前循环内恒定的随机值 (0..1)' },
	{ name: 'variable.emitter_random_2',   display: '发射器随机值 2', category: 'emitter_random', doc: '发射器当前循环内恒定的随机值 (0..1)' },
	{ name: 'variable.emitter_random_3',   display: '发射器随机值 3', category: 'emitter_random', doc: '发射器当前循环内恒定的随机值 (0..1)' },
	{ name: 'variable.emitter_random_4',   display: '发射器随机值 4', category: 'emitter_random', doc: '发射器当前循环内恒定的随机值 (0..1)' },
]

// 官方数学函数。easing 由下方循环自动生成（30 个，均为 (start, end, 0_to_1)）。
export const MolangFunctions = [
	{ name: 'math.abs',      args: 1, display: '绝对值',    category: 'math' },
	{ name: 'math.ceil',     args: 1, display: '向上取整',  category: 'math' },
	{ name: 'math.floor',    args: 1, display: '向下取整',  category: 'math' },
	{ name: 'math.trunc',    args: 1, display: '截断取整',  category: 'math' },
	{ name: 'math.round',    args: 1, display: '四舍五入',  category: 'math' },
	{ name: 'math.sign',     args: 1, display: '符号',      category: 'math' },
	{ name: 'math.sqrt',     args: 1, display: '平方根',    category: 'math' },
	{ name: 'math.exp',      args: 1, display: 'e 的幂',    category: 'math' },
	{ name: 'math.ln',       args: 1, display: '自然对数',  category: 'math' },
	{ name: 'math.mod',      args: 2, display: '取余数',    category: 'math' },
	{ name: 'math.pi',       args: 0, display: '圆周率 π',  category: 'math' },
	{ name: 'math.pow',      args: 2, display: '幂运算',    category: 'math' },
	{ name: 'math.copy_sign',args: 2, display: '复制符号',  category: 'math' },
	// 三角函数（角度制）
	{ name: 'math.sin',      args: 1, display: '正弦 sin',  category: 'trig' },
	{ name: 'math.cos',      args: 1, display: '余弦 cos',  category: 'trig' },
	{ name: 'math.asin',     args: 1, display: '反正弦',    category: 'trig' },
	{ name: 'math.acos',     args: 1, display: '反余弦',    category: 'trig' },
	{ name: 'math.atan',     args: 1, display: '反正切',    category: 'trig' },
	{ name: 'math.atan2',    args: 2, display: '反正切2 y/x', category: 'trig' },
	// 比较与范围
	{ name: 'math.min',      args: 2, display: '最小值',    category: 'compare' },
	{ name: 'math.max',      args: 2, display: '最大值',    category: 'compare' },
	{ name: 'math.clamp',    args: 3, display: '限制范围',  category: 'compare' },
	{ name: 'math.min_angle',args: 1, display: '最小角度',  category: 'compare' },
	// 随机
	{ name: 'math.random',        args: 2, display: '随机浮点数', category: 'random' },
	{ name: 'math.random_integer',args: 2, display: '随机整数',   category: 'random' },
	{ name: 'math.die_roll',      args: 3, display: '随机求和',   category: 'random' },
	{ name: 'math.die_roll_integer', args: 3, display: '随机整数求和', category: 'random' },
	// 插值
	{ name: 'math.lerp',          args: 3, display: '线性插值',   category: 'lerp' },
	{ name: 'math.lerprotate',    args: 3, display: '角度插值',   category: 'lerp' },
	{ name: 'math.inverse_lerp',  args: 3, display: '反向插值',   category: 'lerp' },
	{ name: 'math.hermite_blend', args: 1, display: 'Hermite 插值', category: 'lerp' },
]

for (const mode of ['ease_in', 'ease_out', 'ease_in_out']) {
	for (const kind of ['sine', 'quad', 'cubic', 'quart', 'quint', 'expo', 'circ', 'back', 'elastic', 'bounce']) {
		MolangFunctions.push({
			name: `math.${mode}_${kind}`, args: 3,
			display: `缓动 ${mode}_${kind}`, category: 'easing',
		})
	}
}

// 运算符注册表
export const MolangOperators = [
	{ name: 'add',  symbol: '+', molang: '+',  display: '加', category: 'arithmetic' },
	{ name: 'sub',  symbol: '-', molang: '-',  display: '减', category: 'arithmetic' },
	{ name: 'mul',  symbol: '×', molang: '*',  display: '乘', category: 'arithmetic' },
	{ name: 'div',  symbol: '÷', molang: '/',  display: '除', category: 'arithmetic' },
	{ name: 'mod',  symbol: '%', molang: '%',  display: '取余', category: 'arithmetic' },
	{ name: 'eq',   symbol: '=', molang: '==', display: '等于', category: 'comparison' },
	{ name: 'ne',   symbol: '≠', molang: '!=', display: '不等于', category: 'comparison' },
	{ name: 'lt',   symbol: '<', molang: '<',  display: '小于', category: 'comparison' },
	{ name: 'le',   symbol: '≤', molang: '<=', display: '小于等于', category: 'comparison' },
	{ name: 'gt',   symbol: '>', molang: '>',  display: '大于', category: 'comparison' },
	{ name: 'ge',   symbol: '≥', molang: '>=', display: '大于等于', category: 'comparison' },
	{ name: 'and',  symbol: '且', molang: '&&', display: '并且', category: 'logic' },
	{ name: 'or',   symbol: '或', molang: '||', display: '或者', category: 'logic' },
]

export const VariableCategories = {
	particle: '粒子变量',
	particle_random: '粒子随机值',
	emitter: '发射器变量',
	emitter_random: '发射器随机值',
}

export const FunctionCategories = {
	math: '数学',
	trig: '三角函数',
	compare: '比较与范围',
	random: '随机',
	lerp: '插值',
	easing: 'Easing 缓动',
}

// 供搜索使用：中英文关键词 → 候选
export function searchMolang(keyword) {
	if (!keyword) return { variables: MolangVariables, functions: MolangFunctions, operators: MolangOperators }
	const k = keyword.toLowerCase()
	const match = (...texts) => texts.some(t => t && t.toLowerCase().includes(k))
	return {
		variables: MolangVariables.filter(v => match(v.name, v.display, v.doc, 'variable')),
		functions: MolangFunctions.filter(f => match(f.name, f.display, 'math')),
		operators: MolangOperators.filter(o => match(o.symbol, o.display, o.molang)),
	}
}
