// Toolbox 定义：分类 + Flyout（shadow 预填）+ 关键词搜索（通过 updateToolbox 过滤实现）。
import { MolangVariables, MolangFunctions, searchMolang } from '../molang/registries'
import { sanitizeMolangName } from '../molang/MolangBlocks'

function shadowNum(v) { return { shadow: { type: 'molang_number', fields: { NUM: v } } } }

function moduleFlyout(type, inputs = {}, fields = {}) {
	return { kind: 'block', type, fields, inputs }
}

function fnBlock(fn) {
	return { kind: 'block', type: 'molang_fn_' + sanitizeMolangName(fn.name) }
}

export function buildToolbox() {
	return {
		kind: 'categoryToolbox',
		contents: [
			{
				kind: 'category', name: '粒子控制', colour: '#4C97FF',
				contents: [moduleFlyout('particle_effect')],
			},
			{
				kind: 'category', name: '发射器', colour: '#4C97FF',
				contents: [
					moduleFlyout('emitter_rate', { RATE: shadowNum(30), MAXIMUM: shadowNum(80) }, { MODE: 'steady' }),
					moduleFlyout('emitter_lifetime', { ACTIVE_TIME: shadowNum(1) }, { MODE: 'looping' }),
				],
			},
			{
				kind: 'category', name: '发射形状', colour: '#0FBD8C',
				contents: [
					moduleFlyout('emitter_shape', { RADIUS: shadowNum(1), OFFSET_X: shadowNum(0), OFFSET_Y: shadowNum(0), OFFSET_Z: shadowNum(0) }, { MODE: 'sphere' }),
				],
			},
			{
				kind: 'category', name: '运动', colour: '#FFAB19',
				contents: [
					moduleFlyout('motion', { SPEED: shadowNum(1), ACC_X: shadowNum(0), ACC_Y: shadowNum(-0.5), ACC_Z: shadowNum(0), DRAG: shadowNum(0.02) }, { MODE: 'dynamic' }),
				],
			},
			{
				kind: 'category', name: '旋转', colour: '#FFAB19',
				contents: [
					moduleFlyout('rotation', { INITIAL: shadowNum(0), RATE: shadowNum(90), ACCEL: shadowNum(0), DRAG: shadowNum(0) }, { MODE: 'dynamic' }),
				],
			},
			{
				kind: 'category', name: '外观', colour: '#9966FF',
				contents: [
					moduleFlyout('appearance', { SIZE_X: shadowNum(0.5), SIZE_Y: shadowNum(0.5) }, { FACING: 'rotate_xyz' }),
				],
			},
			{
				kind: 'category', name: '颜色', colour: '#CF63CF',
				contents: [
					moduleFlyout('color', {}, { MODE: 'static' }),
					moduleFlyout('color', { INTERPOLANT: { shadow: { type: 'molang_var', fields: { VAR: 'variable.particle_age' } } }, RANGE: shadowNum(1) }, { MODE: 'gradient', STOP_COUNT: '2' }),
					moduleFlyout('color', { EXPR_R: shadowNum(1), EXPR_G: shadowNum(1), EXPR_B: shadowNum(1), EXPR_A: shadowNum(1) }, { MODE: 'expression' }),
				],
			},
			{
				kind: 'category', name: '材质/UV', colour: '#CB742C',
				contents: [
					moduleFlyout('texture_uv', { TEX_W: shadowNum(16), TEX_H: shadowNum(16), UV_X: shadowNum(0), UV_Y: shadowNum(0), UVS_X: shadowNum(16), UVS_Y: shadowNum(16), STEP_X: shadowNum(1), STEP_Y: shadowNum(1), FPS: shadowNum(12), MAX_FRAME: shadowNum(16) }, { MODE: 'animated' }),
				],
			},
			{
				kind: 'category', name: '碰撞', colour: '#5C81A6',
				contents: [
					moduleFlyout('collision', { RADIUS: shadowNum(0.1), DRAG: shadowNum(0.5), BOUNCE: shadowNum(0.2) }, { EXPIRE: 'FALSE' }),
				],
			},
			{
				kind: 'category', name: '粒子空间', colour: '#5C81A6',
				contents: [
					moduleFlyout('particle_space', {}, { LOCAL_POSITION: 'TRUE', LOCAL_ROTATION: 'FALSE', LOCAL_VELOCITY: 'FALSE' }),
				],
			},
			{
				kind: 'category', name: 'Molang 变量', colour: '#FF8C1A',
				contents: [
					{ kind: 'block', type: 'molang_var' },
					{ kind: 'label', text: '  粒子 / 发射器 官方变量' },
				],
			},
			{
				kind: 'category', name: '运算', colour: '#5C81A6',
				contents: [
					{ kind: 'block', type: 'molang_number' },
					{ kind: 'block', type: 'molang_op', fields: { OP: 'mul' }, inputs: { A: shadowNum(1), B: shadowNum(1) } },
					{ kind: 'block', type: 'molang_op', fields: { OP: 'add' }, inputs: { A: shadowNum(1), B: shadowNum(1) } },
					{ kind: 'block', type: 'molang_conditional', inputs: { COND: shadowNum(1), THEN: shadowNum(1), ELSE: shadowNum(0) } },
					{ kind: 'block', type: 'molang_raw' },
				],
			},
			{
				kind: 'category', name: 'Molang 数学', colour: '#40BF4E',
				contents: MolangFunctions.filter(f => ['math', 'trig', 'compare', 'random', 'lerp'].includes(f.category)).map(fnBlock),
			},
			{
				kind: 'category', name: 'Easing', colour: '#40BF4E',
				contents: MolangFunctions.filter(f => f.category === 'easing').map(fnBlock),
			},
		],
	}
}

// 关键词搜索 → 过滤后的 Toolbox（中文/英文均可）。
// 模块积木的搜索元数据由名称与 tooltip 匹配。
const MODULE_KEYWORDS = [
	{ name: '粒子控制', type: 'particle_effect', kw: '粒子效果 root 根 effect identifier' },
	{ name: '发射器', type: 'emitter_rate', kw: '发射 rate 速率 amount maximum steady instant rate emitter' },
	{ name: '发射器寿命', type: 'emitter_lifetime', kw: '发射器寿命 looping once active sleep lifetime 循环 单次' },
	{ name: '发射形状', type: 'emitter_shape', kw: '形状 shape sphere box disc 球 立方 圆盘 半径 offset surface' },
	{ name: '运动', type: 'motion', kw: '运动 速度 speed acceleration 加速 drag 阻力 motion dynamic parametric 方向' },
	{ name: '旋转', type: 'rotation', kw: '旋转 rotation spin 转动 rate' },
	{ name: '外观', type: 'appearance', kw: '外观 size 尺寸 material 材质 facing 朝向 billboard camera light 光照' },
	{ name: '颜色', type: 'color', kw: '颜色 color colour gradient 渐变 static expression alpha' },
	{ name: '材质/UV', type: 'texture_uv', kw: 'uv texture 材质 贴图 flipbook 帧率 fps step 步进 frame' },
	{ name: '碰撞', type: 'collision', kw: '碰撞 collision bounce 弹性 阻力 expire 消失 radius' },
	{ name: '粒子空间', type: 'particle_space', kw: '空间 space local position rotation velocity 相对' },
	{ name: '数字', type: 'molang_number', kw: '数字 number 数值' },
	{ name: 'Molang 原始表达式', type: 'molang_raw', kw: 'molang raw 原始 表达式' },
	{ name: 'Molang 变量', type: 'molang_var', kw: '变量 variable age age lifetime random particle emitter' },
	{ name: '运算', type: 'molang_op', kw: '加 减 乘 除 余 运算 add sub mul div mod 比较 逻辑 and or' },
	{ name: '条件', type: 'molang_conditional', kw: '如果 条件 if cond conditional' },
]

export function searchToolbox(keyword) {
	if (!keyword || !keyword.trim()) return buildToolbox()
	const k = keyword.trim().toLowerCase()
	const hits = MODULE_KEYWORDS.filter(m => (m.name + ' ' + m.kw).toLowerCase().includes(k))
	const mol = searchMolang(k)
	const contents = []
	if (hits.length) {
		contents.push({ kind: 'category', name: '积木', colour: '#4C97FF', contents: hits.map(h => ({ kind: 'block', type: h.type })) })
	}
	if (mol.variables.length) {
		contents.push({ kind: 'category', name: 'Molang 变量', colour: '#FF8C1A', contents: [{ kind: 'block', type: 'molang_var' }] })
	}
	const fns = mol.functions
	if (fns.length) {
		contents.push({ kind: 'category', name: 'Molang 函数', colour: '#40BF4E', contents: fns.map(fnBlock) })
	}
	if (!contents.length) contents.push({ kind: 'label', text: '未找到匹配的积木' })
	return { kind: 'categoryToolbox', contents }
}
