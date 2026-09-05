// 粒子模块积木（Statement Blocks）。
// 每个积木的编译目标全部对应 Snowstorm 真实 Config key（见 SNOWSTORM_ANALYSIS.md）。
import * as Blockly from 'blockly'
import { molangToBlockJson } from '../molang/MolangBlocks'
import { parseNumeric } from '../molang/MolangAST'

export const CATEGORY_COLORS = {
	root: '#4C97FF',       // 蓝
	emitter: '#4C97FF',
	shape: '#0FBD8C',      // 青
	lifetime: '#0FBD8C',
	motion: '#FFAB19',     // 橙
	rotation: '#FFAB19',
	appearance: '#9966FF', // 紫
	color: '#CF63CF',
	material: '#CB742C',   // 棕 (材质/UV)
	texture: '#CB742C',
	collision: '#5C81A6',
	space: '#5C81A6',
	molang: '#40BF4EFF',
	variable: '#FF8C1A',
	operator: '#5C81A6',
	molangfn: '#40BF4E',
}

// 给值输入挂 shadow（Scratch 式：槽内灰底数字，可直接点击覆盖，可拖入积木替换）
function shadow(value) {
	return { shadow: { type: 'molang_number', fields: { NUM: parseNumeric(value) ?? 0 } } }
}

function axisInputs(block, names, labels, defaults) {
	names.forEach((name, i) => {
		const input = block.appendValueInput(name).setAlign(Blockly.inputs.Align.RIGHT)
		if (labels[i]) input.appendField(labels[i] + ' ')
		input.setCheck('MolangNumber')
		input.connection.setShadowState({ type: 'molang_number', fields: { NUM: defaults[i] } })
	})
}

function valueInput(block, name, label, def, check = 'MolangNumber') {
	const input = block.appendValueInput(name).setAlign(Blockly.inputs.Align.RIGHT)
	if (label) input.appendField(label + ' ')
	input.setCheck(check)
	if (def !== undefined && def !== null && check === 'MolangNumber') {
		input.connection.setShadowState({ type: 'molang_number', fields: { NUM: def } })
	} else {
		// 无默认值的槽为"可选槽"：允许留空，校验时跳过
		if (!block.beOptional) block.beOptional = []
		block.beOptional.push(name)
	}
	return input
}

function checkbox(block, name, label, def = false) {
	block.appendDummyInput(name).setAlign(Blockly.inputs.Align.RIGHT).appendField(label).appendField(new Blockly.FieldCheckbox(def ? 'TRUE' : 'FALSE'), name)
}

const FACING_OPTIONS = [
	['Rotate XYZ', 'rotate_xyz'], ['Rotate Y', 'rotate_y'], ['Look at XYZ', 'lookat_xyz'], ['Look at Y', 'lookat_y'],
	['Look at Direction', 'lookat_direction'], ['Direction X', 'direction_x'], ['Direction Y', 'direction_y'],
	['Direction Z', 'direction_z'], ['Emitter XY', 'emitter_transform_xy'], ['Emitter XZ', 'emitter_transform_xz'], ['Emitter YZ', 'emitter_transform_yz'],
]
const MATERIAL_OPTIONS = [
	['Blend 混合', 'particles_blend'], ['Additive 加法', 'particles_add'], ['Alpha Test 透明测试', 'particles_alpha'], ['Opaque 不透明', 'particles_opaque'],
]

export const ModuleRegistry = []

function defineModule(def) {
	ModuleRegistry.push(def)
}

// ---------------- 根积木 ----------------
defineModule({
	type: 'particle_effect',
	category: 'root',
	register(Blockly) {
		Blockly.Blocks.particle_effect = {
			init() {
				this.appendDummyInput('HEAD')
					.appendField('粒子效果 ')
					.appendField(new Blockly.FieldTextInput('custom:fire_particle'), 'IDENTIFIER')
				this.appendStatementInput('MODULES').setCheck('Module')
				this.setStyle('root_block')
				this.setTooltip('粒子效果根积木：把各功能模块积木连接到下方')
				this.setDeletable(false)
			}
		}
	},
	compile(block, ctx) {
		ctx.set('identifier', block.getFieldValue('IDENTIFIER'))
	},
})

// ---------------- 发射器：速率 ----------------
defineModule({
	type: 'emitter_rate',
	category: 'emitter',
	label: '发射器',
	register(Blockly) {
		Blockly.Blocks.emitter_rate = {
			init() {
				this.appendDummyInput('HEAD').appendField('发射器')
					.appendField(new Blockly.FieldDropdown([['稳定发射', 'steady'], ['瞬时发射', 'instant'], ['手动发射', 'manual']]), 'MODE')
				valueInput(this, 'RATE', '速率', 30)
				valueInput(this, 'AMOUNT', '数量', 10)
				valueInput(this, 'MAXIMUM', '最大粒子', 80)
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('emitter_block')
				this.setTooltip('发射模式与速率（emitter_rate_*）')
				this.updateShape_()
			},
			mutationToDom() { const c = document.createElement('mutation'); c.setAttribute('mode', this.getFieldValue('MODE')); return c },
			domToMutation(xml) { this.updateShape_(xml.getAttribute('mode')) },
			updateShape_(mode = this.getFieldValue('MODE')) {
				const show = { RATE: mode === 'steady', AMOUNT: mode === 'instant', MAXIMUM: mode === 'steady' || mode === 'manual' }
				for (const [name, vis] of Object.entries(show)) {
					const input = this.getInput(name)
					if (input) input.setVisible(vis)
				}
			}
		}
	},
	compile(block, ctx) {
		const mode = block.getFieldValue('MODE')
		ctx.set('emitter_rate_mode', mode)
		const v = (n) => ctx.value(block, n)
		if (mode === 'steady' && v('RATE') !== null) ctx.set('emitter_rate_rate', v('RATE'))
		if (mode === 'instant' && v('AMOUNT') !== null) ctx.set('emitter_rate_amount', v('AMOUNT'))
		if ((mode === 'steady' || mode === 'manual') && v('MAXIMUM') !== null) ctx.set('emitter_rate_maximum', v('MAXIMUM'))
	},
	decompile(Config, make) {
		const fields = { MODE: Config.emitter_rate_mode || 'steady' }
		const inputs = {}
		if (Config.emitter_rate_rate !== undefined) Object.assign(inputs, { RATE: shadowValue(Config.emitter_rate_rate) })
		if (Config.emitter_rate_amount !== undefined && Config.emitter_rate_amount !== null) Object.assign(inputs, { AMOUNT: shadowValue(Config.emitter_rate_amount) })
		if (Config.emitter_rate_maximum !== undefined && Config.emitter_rate_maximum !== null) Object.assign(inputs, { MAXIMUM: shadowValue(Config.emitter_rate_maximum) })
		return { fields, inputs }
	},
})

// shadow 或积木化值（反编译时使用）：数字→shadow，Molang→积木树
function shadowValue(v) {
	const json = molangToBlockJson(v)
	if (!json) return shadow(0)
	if (json.type === 'molang_number') return { shadow: { type: 'molang_number', fields: { NUM: json.fields.NUM } } }
	return { block: json }
}
export { shadowValue }

// ---------------- 发射器：寿命 ----------------
defineModule({
	type: 'emitter_lifetime',
	category: 'emitter',
	label: '发射器寿命',
	register(Blockly) {
		Blockly.Blocks.emitter_lifetime = {
			init() {
				this.appendDummyInput().appendField('发射器寿命')
					.appendField(new Blockly.FieldDropdown([['循环', 'looping'], ['单次', 'once'], ['表达式', 'expression']]), 'MODE')
				valueInput(this, 'ACTIVE_TIME', '活跃时间', 1)
				valueInput(this, 'SLEEP_TIME', '休眠时间', 0)
				valueInput(this, 'ACTIVATION', '激活条件', 0)
				valueInput(this, 'EXPIRATION', '结束条件', 0)
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('emitter_block')
				this.setTooltip('发射器生命周期（emitter_lifetime_*）')
				this.updateShape_()
			},
			mutationToDom() { const c = document.createElement('mutation'); c.setAttribute('mode', this.getFieldValue('MODE')); return c },
			domToMutation(xml) { this.updateShape_(xml.getAttribute('mode')) },
			updateShape_(mode = this.getFieldValue('MODE')) {
				const show = { ACTIVE_TIME: mode !== 'expression', SLEEP_TIME: mode === 'looping', ACTIVATION: mode === 'expression', EXPIRATION: mode === 'expression' }
				for (const [name, vis] of Object.entries(show)) { const i = this.getInput(name); if (i) i.setVisible(vis) }
			}
		}
	},
	compile(block, ctx) {
		const mode = block.getFieldValue('MODE')
		ctx.set('emitter_lifetime_mode', mode)
		const v = (n) => ctx.value(block, n)
		if (mode !== 'expression' && v('ACTIVE_TIME') !== null) ctx.set('emitter_lifetime_active_time', v('ACTIVE_TIME'))
		if (mode === 'looping' && v('SLEEP_TIME') !== null) ctx.set('emitter_lifetime_sleep_time', v('SLEEP_TIME'))
		if (mode === 'expression') {
			if (v('ACTIVATION') !== null) ctx.set('emitter_lifetime_activation', v('ACTIVATION'))
			if (v('EXPIRATION') !== null) ctx.set('emitter_lifetime_expiration', v('EXPIRATION'))
		}
	},
	decompile(Config) {
		const mode = Config.emitter_lifetime_mode || 'looping'
		const inputs = {}
		if (Config.emitter_lifetime_active_time !== undefined && Config.emitter_lifetime_active_time !== null) inputs.ACTIVE_TIME = shadowValue(Config.emitter_lifetime_active_time)
		if (Config.emitter_lifetime_sleep_time) inputs.SLEEP_TIME = shadowValue(Config.emitter_lifetime_sleep_time)
		if (Config.emitter_lifetime_activation) inputs.ACTIVATION = shadowValue(Config.emitter_lifetime_activation)
		if (Config.emitter_lifetime_expiration) inputs.EXPIRATION = shadowValue(Config.emitter_lifetime_expiration)
		return { fields: { MODE: mode }, inputs }
	},
})

// ---------------- 发射形状 ----------------
defineModule({
	type: 'emitter_shape',
	category: 'shape',
	label: '发射形状',
	register(Blockly) {
		Blockly.Blocks.emitter_shape = {
			init() {
				this.appendDummyInput().appendField('发射形状')
					.appendField(new Blockly.FieldDropdown([['点', 'point'], ['球体', 'sphere'], ['立方体', 'box'], ['圆盘', 'disc'], ['实体包围盒', 'entity_aabb']]), 'MODE')
				valueInput(this, 'OFFSET_X', '偏移 X', 0)
				valueInput(this, 'OFFSET_Y', 'Y', 0)
				valueInput(this, 'OFFSET_Z', 'Z', 0)
				valueInput(this, 'RADIUS', '半径', 1)
				valueInput(this, 'HALF_X', '盒尺寸 X', 1)
				valueInput(this, 'HALF_Y', 'Y', 1)
				valueInput(this, 'HALF_Z', 'Z', 1)
				valueInput(this, 'NORMAL_X', '盘法线 X', 0)
				valueInput(this, 'NORMAL_Y', 'Y', 0)
				valueInput(this, 'NORMAL_Z', 'Z', 0)
				checkbox(this, 'SURFACE_ONLY', '仅表面生成')
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('shape_block')
				this.setTooltip('发射器形状（emitter_shape_*）')
				this.updateShape_()
			},
			mutationToDom() { const c = document.createElement('mutation'); c.setAttribute('mode', this.getFieldValue('MODE')); c.setAttribute('surface', this.getFieldValue('SURFACE_ONLY')); return c },
			domToMutation(xml) { this.updateShape_(xml.getAttribute('mode'), xml.getAttribute('surface') === 'true') },
			updateShape_(mode = this.getFieldValue('MODE'), surface = this.getFieldValue('SURFACE_ONLY') === 'TRUE') {
				const show = {
					OFFSET_X: mode !== 'entity_aabb', OFFSET_Y: mode !== 'entity_aabb', OFFSET_Z: mode !== 'entity_aabb',
					RADIUS: mode === 'sphere' || mode === 'disc',
					HALF_X: mode === 'box', HALF_Y: mode === 'box', HALF_Z: mode === 'box',
					NORMAL_X: mode === 'disc', NORMAL_Y: mode === 'disc', NORMAL_Z: mode === 'disc',
				}
				for (const [name, vis] of Object.entries(show)) { const i = this.getInput(name); if (i) i.setVisible(vis) }
				const sf = this.getField && this.getField('SURFACE_ONLY')
				if (sf) sf.setVisible(['sphere', 'box', 'disc', 'entity_aabb'].includes(mode))
			}
		}
	},
	compile(block, ctx) {
		const mode = block.getFieldValue('MODE')
		ctx.set('emitter_shape_mode', mode)
		const v = (n) => ctx.value(block, n)
		if (mode !== 'entity_aabb') {
			const o = [v('OFFSET_X'), v('OFFSET_Y'), v('OFFSET_Z')]
			if (o.some(x => x !== null)) ctx.set('emitter_shape_offset', o.map(x => x ?? 0))
		}
		if ((mode === 'sphere' || mode === 'disc') && v('RADIUS') !== null) ctx.set('emitter_shape_radius', v('RADIUS'))
		if (mode === 'box') {
			const h = [v('HALF_X'), v('HALF_Y'), v('HALF_Z')]
			ctx.set('emitter_shape_half_dimensions', h.map(x => x ?? 0))
		}
		if (mode === 'disc') {
			const n = [v('NORMAL_X'), v('NORMAL_Y'), v('NORMAL_Z')]
			ctx.set('emitter_shape_plane_normal', n.map(x => x ?? 0))
		}
		ctx.set('emitter_shape_surface_only', block.getFieldValue('SURFACE_ONLY') === 'TRUE')
	},
	decompile(Config) {
		const mode = Config.emitter_shape_mode || 'point'
		const inputs = {}
		const off = Config.emitter_shape_offset
		if (off && off.length === 3) { inputs.OFFSET_X = shadowValue(off[0]); inputs.OFFSET_Y = shadowValue(off[1]); inputs.OFFSET_Z = shadowValue(off[2]) }
		if (Config.emitter_shape_radius !== undefined && Config.emitter_shape_radius !== null) inputs.RADIUS = shadowValue(Config.emitter_shape_radius)
		const hd = Config.emitter_shape_half_dimensions
		if (hd && hd.length === 3) { inputs.HALF_X = shadowValue(hd[0]); inputs.HALF_Y = shadowValue(hd[1]); inputs.HALF_Z = shadowValue(hd[2]) }
		const pn = Config.emitter_shape_plane_normal
		if (pn && pn.length === 3) { inputs.NORMAL_X = shadowValue(pn[0]); inputs.NORMAL_Y = shadowValue(pn[1]); inputs.NORMAL_Z = shadowValue(pn[2]) }
		return { fields: { MODE: mode, SURFACE_ONLY: Config.emitter_shape_surface_only ? 'TRUE' : 'FALSE' }, inputs }
	},
})

// ---------------- 运动 ----------------
defineModule({
	type: 'motion',
	category: 'motion',
	label: '运动',
	register(Blockly) {
		Blockly.Blocks.motion = {
			init() {
				this.appendDummyInput().appendField('运动')
					.appendField(new Blockly.FieldDropdown([['动态', 'dynamic'], ['参数化', 'parametric'], ['静态', 'static']]), 'MODE')
				this.appendDummyInput('DIRECTION_MODE_ROW').appendField('方向')
					.appendField(new Blockly.FieldDropdown([['向外', 'outwards'], ['向内', 'inwards'], ['自定义方向', 'direction']]), 'DIRECTION_MODE')
				valueInput(this, 'DIR_X', '方向 X', 0)
				valueInput(this, 'DIR_Y', 'Y', 0)
				valueInput(this, 'DIR_Z', 'Z', 0)
				valueInput(this, 'SPEED', '初始速度', 1)
				valueInput(this, 'ACC_X', '加速度 X', 0)
				valueInput(this, 'ACC_Y', 'Y', 0)
				valueInput(this, 'ACC_Z', 'Z', 0)
				valueInput(this, 'DRAG', '阻力系数', 0)
				valueInput(this, 'POS_X', '位置 X', 0)
				valueInput(this, 'POS_Y', 'Y', 0)
				valueInput(this, 'POS_Z', 'Z', 0)
				valueInput(this, 'PDIR_X', '方向 X', 0)
				valueInput(this, 'PDIR_Y', 'Y', 0)
				valueInput(this, 'PDIR_Z', 'Z', 0)
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('motion_block')
				this.setTooltip('粒子运动（particle_motion_* / particle_direction_*）')
				this.updateShape_()
			},
			mutationToDom() { const c = document.createElement('mutation'); c.setAttribute('mode', this.getFieldValue('MODE')); c.setAttribute('dm', this.getFieldValue('DIRECTION_MODE')); return c },
			domToMutation(xml) { this.updateShape_(xml.getAttribute('mode'), xml.getAttribute('dm')) },
			updateShape_(mode = this.getFieldValue('MODE'), dm = this.getFieldValue('DIRECTION_MODE')) {
				const show = {
					DIRECTION_MODE_ROW: mode === 'dynamic',
					DIR_X: mode === 'dynamic' && dm === 'direction', DIR_Y: mode === 'dynamic' && dm === 'direction', DIR_Z: mode === 'dynamic' && dm === 'direction',
					SPEED: mode === 'dynamic', ACC_X: mode === 'dynamic', ACC_Y: mode === 'dynamic', ACC_Z: mode === 'dynamic', DRAG: mode === 'dynamic',
					POS_X: mode === 'parametric', POS_Y: mode === 'parametric', POS_Z: mode === 'parametric',
					PDIR_X: mode === 'parametric', PDIR_Y: mode === 'parametric', PDIR_Z: mode === 'parametric',
				}
				for (const [name, vis] of Object.entries(show)) { const i = this.getInput(name); if (i) i.setVisible(vis) }
			}
		}
	},
	compile(block, ctx) {
		const mode = block.getFieldValue('MODE')
		ctx.set('particle_motion_mode', mode)
		const v = (n) => ctx.value(block, n)
		if (mode === 'dynamic') {
			const dm = block.getFieldValue('DIRECTION_MODE')
			ctx.set('particle_direction_mode', dm)
			if (dm === 'direction') {
				const d = [v('DIR_X'), v('DIR_Y'), v('DIR_Z')]
				ctx.set('particle_direction_direction', d.map(x => x ?? 0))
			}
			if (v('SPEED') !== null) ctx.set('particle_motion_linear_speed', v('SPEED'))
			const a = [v('ACC_X'), v('ACC_Y'), v('ACC_Z')]
			if (a.some(x => x !== null)) ctx.set('particle_motion_linear_acceleration', a.map(x => x ?? 0))
			if (v('DRAG') !== null) ctx.set('particle_motion_linear_drag_coefficient', v('DRAG'))
		} else if (mode === 'parametric') {
			const p = [v('POS_X'), v('POS_Y'), v('POS_Z')]
			if (p.some(x => x !== null)) ctx.set('particle_motion_relative_position', p.map(x => x ?? 0))
			const d = [v('PDIR_X'), v('PDIR_Y'), v('PDIR_Z')]
			if (d.some(x => x !== null)) ctx.set('particle_motion_direction', d.map(x => x ?? 0))
		} else if (mode === 'static') {
			ctx.set('particle_motion_static', true)
		}
	},
	decompile(Config) {
		const mode = Config.particle_motion_mode || 'dynamic'
		const inputs = {}
		const dm = Config.particle_direction_mode || 'outwards'
		const dir = Config.particle_direction_direction
		if (dir && dir.length === 3) { inputs.DIR_X = shadowValue(dir[0]); inputs.DIR_Y = shadowValue(dir[1]); inputs.DIR_Z = shadowValue(dir[2]) }
		if (Config.particle_motion_linear_speed !== undefined && Config.particle_motion_linear_speed !== null) inputs.SPEED = shadowValue(Config.particle_motion_linear_speed)
		const acc = Config.particle_motion_linear_acceleration
		if (acc && acc.length === 3) { inputs.ACC_X = shadowValue(acc[0]); inputs.ACC_Y = shadowValue(acc[1]); inputs.ACC_Z = shadowValue(acc[2]) }
		if (Config.particle_motion_linear_drag_coefficient) inputs.DRAG = shadowValue(Config.particle_motion_linear_drag_coefficient)
		const pos = Config.particle_motion_relative_position
		if (pos && pos.length === 3) { inputs.POS_X = shadowValue(pos[0]); inputs.POS_Y = shadowValue(pos[1]); inputs.POS_Z = shadowValue(pos[2]) }
		const pdir = Config.particle_motion_direction
		if (pdir && pdir.length === 3) { inputs.PDIR_X = shadowValue(pdir[0]); inputs.PDIR_Y = shadowValue(pdir[1]); inputs.PDIR_Z = shadowValue(pdir[2]) }
		return { fields: { MODE: mode, DIRECTION_MODE: dm }, inputs }
	},
})

// ---------------- 旋转 ----------------
defineModule({
	type: 'rotation',
	category: 'rotation',
	label: '旋转',
	register(Blockly) {
		Blockly.Blocks.rotation = {
			init() {
				this.appendDummyInput().appendField('旋转')
					.appendField(new Blockly.FieldDropdown([['动态', 'dynamic'], ['参数化', 'parametric']]), 'MODE')
				valueInput(this, 'INITIAL', '初始旋转角度 (°)', 0)
				valueInput(this, 'RATE', '旋转速度 (°/秒)', 0)
				valueInput(this, 'ACCEL', '旋转加速度', 0)
				valueInput(this, 'DRAG', '旋转阻力', 0)
				valueInput(this, 'ROT', '旋转表达式 (°)', 0)
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('motion_block')
				this.setTooltip('粒子旋转（particle_rotation_*）')
				this.updateShape_()
			},
			mutationToDom() { const c = document.createElement('mutation'); c.setAttribute('mode', this.getFieldValue('MODE')); return c },
			domToMutation(xml) { this.updateShape_(xml.getAttribute('mode')) },
			updateShape_(mode = this.getFieldValue('MODE')) {
				const show = { INITIAL: mode === 'dynamic', RATE: mode === 'dynamic', ACCEL: mode === 'dynamic', DRAG: mode === 'dynamic', ROT: mode === 'parametric' }
				for (const [name, vis] of Object.entries(show)) { const i = this.getInput(name); if (i) i.setVisible(vis) }
			}
		}
	},
	compile(block, ctx) {
		const mode = block.getFieldValue('MODE')
		ctx.set('particle_rotation_mode', mode)
		const v = (n) => ctx.value(block, n)
		if (mode === 'dynamic') {
			if (v('INITIAL') !== null) ctx.set('particle_rotation_initial_rotation', v('INITIAL'))
			if (v('RATE') !== null) ctx.set('particle_rotation_rotation_rate', v('RATE'))
			if (v('ACCEL') !== null) ctx.set('particle_rotation_rotation_acceleration', v('ACCEL'))
			if (v('DRAG') !== null) ctx.set('particle_rotation_rotation_drag_coefficient', v('DRAG'))
		} else if (mode === 'parametric') {
			if (v('ROT') !== null) ctx.set('particle_rotation_rotation', v('ROT'))
		}
	},
	decompile(Config) {
		const mode = Config.particle_rotation_mode || 'dynamic'
		const inputs = {}
		if (Config.particle_rotation_initial_rotation !== undefined && Config.particle_rotation_initial_rotation !== null) inputs.INITIAL = shadowValue(Config.particle_rotation_initial_rotation)
		if (Config.particle_rotation_rotation_rate !== undefined && Config.particle_rotation_rotation_rate !== null) inputs.RATE = shadowValue(Config.particle_rotation_rotation_rate)
		if (Config.particle_rotation_rotation_acceleration) inputs.ACCEL = shadowValue(Config.particle_rotation_rotation_acceleration)
		if (Config.particle_rotation_rotation_drag_coefficient) inputs.DRAG = shadowValue(Config.particle_rotation_rotation_drag_coefficient)
		if (Config.particle_rotation_rotation) inputs.ROT = shadowValue(Config.particle_rotation_rotation)
		return { fields: { MODE: mode }, inputs }
	},
})

// ---------------- 外观（尺寸/材质/朝向/光照） ----------------
defineModule({
	type: 'appearance',
	category: 'appearance',
	label: '外观',
	register(Blockly) {
		Blockly.Blocks.appearance = {
			init() {
				this.appendDummyInput().appendField('外观')
				valueInput(this, 'SIZE_X', '尺寸 X', 0.5)
				valueInput(this, 'SIZE_Y', 'Y', 0.5)
				this.appendDummyInput('MAT_ROW').appendField('材质')
					.appendField(new Blockly.FieldDropdown(MATERIAL_OPTIONS.concat([['自定义', 'custom']])), 'MATERIAL')
				this.appendDummyInput('MAT_CUSTOM_ROW').appendField('自定义材质名')
					.appendField(new Blockly.FieldTextInput('custom_material'), 'MATERIAL_CUSTOM')
				this.appendDummyInput('FACING_ROW').appendField('朝向')
					.appendField(new Blockly.FieldDropdown(FACING_OPTIONS), 'FACING')
				this.appendDummyInput('DIR_MODE_ROW').appendField('方向来源')
					.appendField(new Blockly.FieldDropdown([['跟随运动', 'derive_from_velocity'], ['自定义', 'custom']]), 'DIRECTION_MODE')
				valueInput(this, 'DIR_X', '方向 X', 0)
				valueInput(this, 'DIR_Y', 'Y', 0)
				valueInput(this, 'DIR_Z', 'Z', 0)
				valueInput(this, 'THRESHOLD', '最小速度', 0.01)
				checkbox(this, 'LIGHT', '环境光照')
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('appearance_block')
				this.setTooltip('尺寸、材质、摄像头朝向、方向来源、光照（particle_appearance_*）')
				this.updateShape_()
			},
			mutationToDom() {
				const c = document.createElement('mutation')
				c.setAttribute('mat', this.getFieldValue('MATERIAL'))
				c.setAttribute('facing', this.getFieldValue('FACING'))
				c.setAttribute('dir_mode', this.getFieldValue('DIRECTION_MODE'))
				return c
			},
			domToMutation(xml) { this.updateShape_(xml.getAttribute('mat'), xml.getAttribute('facing'), xml.getAttribute('dir_mode')) },
			updateShape_(mat = this.getFieldValue('MATERIAL'), facing = this.getFieldValue('FACING'), dirMode = this.getFieldValue('DIRECTION_MODE')) {
				const customMat = this.getInput('MAT_CUSTOM_ROW')
				if (customMat) customMat.setVisible(mat === 'custom')
				// 仅在朝向依赖方向时显示（与原版 condition 一致）
				const directionish = facing.startsWith('direction') || facing === 'lookat_direction'
				const rows = {
					DIR_MODE_ROW: directionish,
					DIR_X: directionish && dirMode === 'custom',
					DIR_Y: directionish && dirMode === 'custom',
					DIR_Z: directionish && dirMode === 'custom',
					THRESHOLD: directionish && dirMode === 'derive_from_velocity',
				}
				for (const [name, vis] of Object.entries(rows)) { const i = this.getInput(name); if (i) i.setVisible(vis) }
			},
			onchange() {
				// 朝向/方向模式下拉变化时刷新可见性（mutation 之外的字段变化）
				const facing = this.getFieldValue('FACING')
				const dirMode = this.getFieldValue('DIRECTION_MODE')
				const directionish = facing.startsWith('direction') || facing === 'lookat_direction'
				const rows = {
					DIR_MODE_ROW: directionish,
					DIR_X: directionish && dirMode === 'custom',
					DIR_Y: directionish && dirMode === 'custom',
					DIR_Z: directionish && dirMode === 'custom',
					THRESHOLD: directionish && dirMode === 'derive_from_velocity',
				}
				for (const [name, vis] of Object.entries(rows)) { const i = this.getInput(name); if (i) i.setVisible(vis) }
			}
		}
	},
	compile(block, ctx) {
		const v = (n) => ctx.value(block, n)
		const sx = v('SIZE_X'), sy = v('SIZE_Y')
		if (sx !== null || sy !== null) ctx.set('particle_appearance_size', [sx ?? 0.2, sy ?? 0.2])
		const mat = block.getFieldValue('MATERIAL')
		ctx.set('particle_appearance_material', mat === 'custom' ? (block.getFieldValue('MATERIAL_CUSTOM') || 'custom') : mat)
		const facing = block.getFieldValue('FACING')
		ctx.set('particle_appearance_facing_camera_mode', facing)
		if (facing.startsWith('direction') || facing === 'lookat_direction') {
			const dirMode = block.getFieldValue('DIRECTION_MODE')
			ctx.set('particle_appearance_direction_mode', dirMode)
			if (dirMode === 'custom') {
				const d = [v('DIR_X'), v('DIR_Y'), v('DIR_Z')]
				if (d.some(x => x !== null)) ctx.set('particle_appearance_direction', d.map(x => x ?? 0))
			} else {
				if (v('THRESHOLD') !== null) ctx.set('particle_appearance_speed_threshold', v('THRESHOLD'))
			}
		}
		ctx.set('particle_color_light', block.getFieldValue('LIGHT') === 'TRUE')
	},
	decompile(Config) {
		const inputs = {}
		const size = Config.particle_appearance_size
		if (size && size.length === 2) { inputs.SIZE_X = shadowValue(size[0]); inputs.SIZE_Y = shadowValue(size[1]) }
		const mat = Config.particle_appearance_material || 'particles_blend'
		const known = MATERIAL_OPTIONS.some(o => o[1] === mat)
		const facing = Config.particle_appearance_facing_camera_mode || 'rotate_xyz'
		const fields = {
			MATERIAL: known ? mat : 'custom',
			MATERIAL_CUSTOM: known ? 'custom_material' : mat,
			FACING: facing,
			LIGHT: Config.particle_color_light ? 'TRUE' : 'FALSE',
		}
		const directionish = facing.startsWith('direction') || facing === 'lookat_direction'
		if (directionish) {
			fields.DIRECTION_MODE = Config.particle_appearance_direction_mode || 'derive_from_velocity'
			const dir = Config.particle_appearance_direction
			if (dir && dir.length === 3) { inputs.DIR_X = shadowValue(dir[0]); inputs.DIR_Y = shadowValue(dir[1]); inputs.DIR_Z = shadowValue(dir[2]) }
			if (Config.particle_appearance_speed_threshold !== undefined && Config.particle_appearance_speed_threshold !== null) inputs.THRESHOLD = shadowValue(Config.particle_appearance_speed_threshold)
		}
		return { fields, inputs }
	},
})

// ---------------- 颜色 ----------------
defineModule({
	type: 'color',
	category: 'color',
	label: '颜色',
	register(Blockly) {
		Blockly.Blocks.color = {
			init() {
				this.appendDummyInput().appendField('颜色')
					.appendField(new Blockly.FieldDropdown([['固定颜色', 'static'], ['颜色渐变', 'gradient'], ['颜色表达式', 'expression']]), 'MODE')
				this.appendDummyInput('STATIC_ROW').appendField('颜色')
					.appendField(new Blockly.FieldColour('#ffffff'), 'COLOR')
				valueInput(this, 'INTERPOLANT', '渐变插值', 0)
				valueInput(this, 'RANGE', '渐变范围', 1)
				this.appendDummyInput('STOPS_ROW').appendField('渐变点数')
					.appendField(new Blockly.FieldDropdown([['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8']]), 'STOP_COUNT')
				valueInput(this, 'EXPR_R', 'R', 1)
				valueInput(this, 'EXPR_G', 'G', 1)
				valueInput(this, 'EXPR_B', 'B', 1)
				valueInput(this, 'EXPR_A', 'A', 1)
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('color_block')
				this.setTooltip('粒子颜色（particle_color_*），渐变点位置为 0-100，颜色含透明度')
				this.updateShape_()
			},
			mutationToDom() {
				const c = document.createElement('mutation')
				c.setAttribute('mode', this.getFieldValue('MODE'))
				c.setAttribute('stops', this.getFieldValue('STOP_COUNT'))
				return c
			},
			domToMutation(xml) { this.updateShape_(xml.getAttribute('mode'), parseInt(xml.getAttribute('stops') || '2')) },
			updateShape_(mode = this.getFieldValue('MODE'), stops = parseInt(this.getFieldValue('STOP_COUNT') || '2')) {
				const show = {
					STATIC_ROW: mode === 'static',
					INTERPOLANT: mode === 'gradient', RANGE: mode === 'gradient', STOPS_ROW: mode === 'gradient',
					EXPR_R: mode === 'expression', EXPR_G: mode === 'expression', EXPR_B: mode === 'expression', EXPR_A: mode === 'expression',
				}
				for (const [name, vis] of Object.entries(show)) { const i = this.getInput(name); if (i) i.setVisible(vis) }
				// 动态渐变点行
				for (let i = 0; i < 8; i++) {
					const name = 'STOP' + i
					if (this.getInput(name)) { this.removeInput(name); }
				}
				if (mode === 'gradient') {
					for (let i = 0; i < stops; i++) {
						const row = this.appendDummyInput('STOP' + i).setAlign(Blockly.inputs.Align.RIGHT)
						row.appendField(`点${i + 1} 位置`)
						row.appendField(new Blockly.FieldNumber(Math.round(i * 100 / Math.max(stops - 1, 1)), 0, 100), 'STOP_POS' + i)
						row.appendField('颜色')
						row.appendField(new Blockly.FieldColour('#ffffff'), 'STOP_COL' + i)
					}
				}
			}
		}
	},
	compile(block, ctx) {
		const mode = block.getFieldValue('MODE')
		ctx.set('particle_color_mode', mode)
		const v = (n) => ctx.value(block, n)
		if (mode === 'static') {
			ctx.set('particle_color_static', block.getFieldValue('COLOR'))
		} else if (mode === 'gradient') {
			if (v('INTERPOLANT') !== null) ctx.set('particle_color_interpolant', v('INTERPOLANT'))
			if (v('RANGE') !== null) ctx.set('particle_color_range', v('RANGE'))
			const stops = parseInt(block.getFieldValue('STOP_COUNT') || '2')
			const points = []
			for (let i = 0; i < stops; i++) {
				points.push({
					percent: parseFloat(block.getFieldValue('STOP_POS' + i) || 0),
					color: block.getFieldValue('STOP_COL' + i) + 'ff',
				})
			}
			ctx.set('particle_color_gradient', points)
		} else if (mode === 'expression') {
			const e = [v('EXPR_R'), v('EXPR_G'), v('EXPR_B'), v('EXPR_A')]
			if (e.some(x => x !== null)) ctx.set('particle_color_expression', e.map(x => x ?? 0))
		}
	},
	decompile(Config) {
		const mode = Config.particle_color_mode || 'static'
		const fields = { MODE: mode }
		const inputs = {}
		if (Config.particle_color_static) fields.COLOR = (Config.particle_color_static + '').slice(0, 7)
		if (Config.particle_color_interpolant) inputs.INTERPOLANT = { block: molangToBlockJson(Config.particle_color_interpolant) || { type: 'molang_raw', fields: { EXPR: Config.particle_color_interpolant } } }
		if (Config.particle_color_range !== undefined && Config.particle_color_range !== null) inputs.RANGE = shadowValue(Config.particle_color_range)
		const grad = Config.particle_color_gradient
		if (mode === 'gradient' && Array.isArray(grad)) {
			fields.STOP_COUNT = String(Math.min(Math.max(grad.length, 2), 8))
			grad.slice(0, 8).forEach((p, i) => {
				fields['STOP_POS' + i] = p.percent ?? 0
				fields['STOP_COL' + i] = (p.color || '#ffffffff').slice(0, 7)
			})
		}
		const expr = Config.particle_color_expression
		if (mode === 'expression' && expr && expr.length === 4) {
			inputs.EXPR_R = shadowValue(expr[0]); inputs.EXPR_G = shadowValue(expr[1]); inputs.EXPR_B = shadowValue(expr[2]); inputs.EXPR_A = shadowValue(expr[3])
		}
		return { fields, inputs }
	},
})

// ---------------- 材质 / Texture / UV ----------------
defineModule({
	type: 'texture_uv',
	category: 'material',
	label: '材质/UV',
	register(Blockly) {
		Blockly.Blocks.texture_uv = {
			init() {
				this.appendDummyInput().appendField('UV 动画')
					.appendField(new Blockly.FieldDropdown([['静态', 'static'], ['全尺寸', 'full'], ['逐帧动画', 'animated']]), 'MODE')
				valueInput(this, 'TEX_W', '纹理宽度', 16)
				valueInput(this, 'TEX_H', '纹理高度', 16)
				valueInput(this, 'UV_X', 'UV 偏移 X', 0)
				valueInput(this, 'UV_Y', 'Y', 0)
				valueInput(this, 'UVS_X', 'UV 大小 X', 16)
				valueInput(this, 'UVS_Y', 'Y', 16)
				valueInput(this, 'STEP_X', 'UV 步进 X', 0)
				valueInput(this, 'STEP_Y', 'Y', 0)
				valueInput(this, 'FPS', '帧率 FPS', 12)
				valueInput(this, 'MAX_FRAME', '最大帧数', 0)
				checkbox(this, 'STRETCH', '拉伸到寿命')
				checkbox(this, 'LOOP', '循环动画')
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('texture_block')
				this.setTooltip('UV 与翻转页动画（particle_texture_*）')
				this.updateShape_()
			},
			mutationToDom() { const c = document.createElement('mutation'); c.setAttribute('mode', this.getFieldValue('MODE')); return c },
			domToMutation(xml) { this.updateShape_(xml.getAttribute('mode')) },
			updateShape_(mode = this.getFieldValue('MODE')) {
				const show = {
					TEX_W: mode !== 'full', TEX_H: mode !== 'full',
					UV_X: mode !== 'full', UV_Y: mode !== 'full',
					UVS_X: mode !== 'full', UVS_Y: mode !== 'full',
					STEP_X: mode === 'animated', STEP_Y: mode === 'animated',
					FPS: mode === 'animated', MAX_FRAME: mode === 'animated',
					STRETCH: mode === 'animated', LOOP: mode === 'animated',
				}
				for (const [name, vis] of Object.entries(show)) { const i = this.getInput(name); if (i) i.setVisible(vis) }
			}
		}
	},
	compile(block, ctx) {
		const mode = block.getFieldValue('MODE')
		ctx.set('particle_texture_mode', mode)
		const v = (n) => ctx.value(block, n)
		if (mode !== 'full') {
			const ts = [v('TEX_W'), v('TEX_H')]
			if (ts.some(x => x !== null)) ctx.set('particle_texture_size', ts.map(x => x ?? 16))
			const uv = [v('UV_X'), v('UV_Y')]
			if (uv.some(x => x !== null)) ctx.set('particle_texture_uv', uv.map(x => x ?? 0))
			const us = [v('UVS_X'), v('UVS_Y')]
			if (us.some(x => x !== null)) ctx.set('particle_texture_uv_size', us.map(x => x ?? 16))
		}
		if (mode === 'animated') {
			const st = [v('STEP_X'), v('STEP_Y')]
			if (st.some(x => x !== null)) ctx.set('particle_texture_uv_step', st.map(x => x ?? 0))
			if (v('FPS') !== null) ctx.set('particle_texture_frames_per_second', v('FPS'))
			if (v('MAX_FRAME') !== null) ctx.set('particle_texture_max_frame', v('MAX_FRAME'))
			ctx.set('particle_texture_stretch_to_lifetime', block.getFieldValue('STRETCH') === 'TRUE')
			ctx.set('particle_texture_loop', block.getFieldValue('LOOP') === 'TRUE')
		}
	},
	decompile(Config) {
		const mode = Config.particle_texture_mode || 'static'
		const inputs = {}
		const put2 = (key, a, b) => { inputs[a] = shadowValue(Config[key]?.[0] ?? 0); inputs[b] = shadowValue(Config[key]?.[1] ?? 0) }
		if (mode !== 'full') {
			put2('particle_texture_size', 'TEX_W', 'TEX_H')
			put2('particle_texture_uv', 'UV_X', 'UV_Y')
			put2('particle_texture_uv_size', 'UVS_X', 'UVS_Y')
		}
		if (mode === 'animated') {
			put2('particle_texture_uv_step', 'STEP_X', 'STEP_Y')
			if (Config.particle_texture_frames_per_second !== undefined && Config.particle_texture_frames_per_second !== null) inputs.FPS = shadowValue(Config.particle_texture_frames_per_second)
			if (Config.particle_texture_max_frame !== undefined && Config.particle_texture_max_frame !== null) inputs.MAX_FRAME = shadowValue(Config.particle_texture_max_frame)
		}
		return {
			fields: {
				MODE: mode,
				STRETCH: Config.particle_texture_stretch_to_lifetime ? 'TRUE' : 'FALSE',
				LOOP: Config.particle_texture_loop ? 'TRUE' : 'FALSE',
			},
			inputs,
		}
	},
})

// ---------------- 碰撞（模块存在 = 开启） ----------------
defineModule({
	type: 'collision',
	category: 'collision',
	label: '碰撞',
	register(Blockly) {
		Blockly.Blocks.collision = {
			init() {
				this.appendDummyInput().appendField('碰撞')
				valueInput(this, 'RADIUS', '碰撞箱半径', 0.1)
				valueInput(this, 'DRAG', '碰撞阻力', 0)
				valueInput(this, 'BOUNCE', '弹性', 0)
				valueInput(this, 'CONDITION', '启用条件 (Molang)')
				checkbox(this, 'EXPIRE', '碰撞后消失')
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('collision_block')
				this.setTooltip('粒子与方块碰撞（particle_collision_*）。删除本积木 = 关闭碰撞')
			}
		}
	},
	compile(block, ctx) {
		ctx.set('particle_collision_toggle', true)
		const v = (n) => ctx.value(block, n)
		if (v('RADIUS') !== null) ctx.set('particle_collision_collision_radius', v('RADIUS'))
		if (v('DRAG') !== null) ctx.set('particle_collision_collision_drag', v('DRAG'))
		if (v('BOUNCE') !== null) ctx.set('particle_collision_coefficient_of_restitution', v('BOUNCE'))
		if (v('CONDITION') !== null) ctx.set('particle_collision_enabled', v('CONDITION'))
		ctx.set('particle_collision_expire_on_contact', block.getFieldValue('EXPIRE') === 'TRUE')
	},
	decompile(Config) {
		if (!Config.particle_collision_toggle) return null
		const inputs = {}
		if (Config.particle_collision_collision_radius !== undefined && Config.particle_collision_collision_radius !== null) inputs.RADIUS = shadowValue(Config.particle_collision_collision_radius)
		if (Config.particle_collision_collision_drag !== undefined && Config.particle_collision_collision_drag !== null) inputs.DRAG = shadowValue(Config.particle_collision_collision_drag)
		if (Config.particle_collision_coefficient_of_restitution !== undefined && Config.particle_collision_coefficient_of_restitution !== null) inputs.BOUNCE = shadowValue(Config.particle_collision_coefficient_of_restitution)
		if (Config.particle_collision_enabled) inputs.CONDITION = { block: molangToBlockJson(Config.particle_collision_enabled) || { type: 'molang_raw', fields: { EXPR: Config.particle_collision_enabled } } }
		return { fields: { EXPIRE: Config.particle_collision_expire_on_contact ? 'TRUE' : 'FALSE' }, inputs }
	},
})

// ---------------- 粒子空间 ----------------
defineModule({
	type: 'particle_space',
	category: 'space',
	label: '粒子空间',
	register(Blockly) {
		Blockly.Blocks.particle_space = {
			init() {
				this.appendDummyInput().appendField('粒子空间')
				checkbox(this, 'LOCAL_POSITION', '相对位置')
				checkbox(this, 'LOCAL_ROTATION', '相对旋转')
				checkbox(this, 'LOCAL_VELOCITY', '相对速度')
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('space_block')
				this.setTooltip('实体空间模拟开关（space_local_*）')
			}
		}
	},
	compile(block, ctx) {
		ctx.set('space_local_position', block.getFieldValue('LOCAL_POSITION') === 'TRUE')
		ctx.set('space_local_rotation', block.getFieldValue('LOCAL_ROTATION') === 'TRUE')
		ctx.set('space_local_velocity', block.getFieldValue('LOCAL_VELOCITY') === 'TRUE')
	},
	decompile(Config) {
		return {
			fields: {
				LOCAL_POSITION: Config.space_local_position ? 'TRUE' : 'FALSE',
				LOCAL_ROTATION: Config.space_local_rotation ? 'TRUE' : 'FALSE',
				LOCAL_VELOCITY: Config.space_local_velocity ? 'TRUE' : 'FALSE',
			},
			inputs: {},
		}
	},
})

// ---------------- 粒子寿命 ----------------
defineModule({
	type: 'particle_lifetime',
	category: 'lifetime',
	label: '粒子寿命',
	register(Blockly) {
		Blockly.Blocks.particle_lifetime = {
			init() {
				this.appendDummyInput().appendField('粒子寿命')
				valueInput(this, 'MAX_AGE', '最大寿命 (秒)', 1)
				valueInput(this, 'KILL_EXPR', '消亡条件 (Molang)')
				this.appendDummyInput('KILL_PLANE_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('击杀平面')
					.appendField('a').appendField(new Blockly.FieldNumber(0), 'KILL_A')
					.appendField('b').appendField(new Blockly.FieldNumber(0), 'KILL_B')
					.appendField('c').appendField(new Blockly.FieldNumber(0), 'KILL_C')
					.appendField('d').appendField(new Blockly.FieldNumber(0), 'KILL_D')
				this.appendDummyInput('EXPIRE_IN_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('触碰消失方块')
					.appendField(new Blockly.FieldTextInput('minecraft:stone, minecraft:leaves'), 'EXPIRE_IN')
				this.appendDummyInput('EXPIRE_OUT_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('离开消失方块')
					.appendField(new Blockly.FieldTextInput('minecraft:air'), 'EXPIRE_OUT')
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('lifetime_block')
				this.setTooltip('粒子生命周期（particle_lifetime_*）')
			}
		}
	},
	compile(block, ctx) {
		const v = (n) => ctx.value(block, n)
		if (v('MAX_AGE') !== null) ctx.set('particle_lifetime_max_lifetime', v('MAX_AGE'))
		if (v('KILL_EXPR') !== null) ctx.set('particle_lifetime_expiration_expression', v('KILL_EXPR'))
		const plane = [
			parseFloat(block.getFieldValue('KILL_A')) || 0,
			parseFloat(block.getFieldValue('KILL_B')) || 0,
			parseFloat(block.getFieldValue('KILL_C')) || 0,
			parseFloat(block.getFieldValue('KILL_D')) || 0,
		]
		if (plane.some(x => x !== 0)) ctx.set('particle_lifetime_kill_plane', plane)
		const toList = (field) => (block.getFieldValue(field) || '').split(',').map(s => s.trim()).filter(s => s)
		const inBlocks = toList('EXPIRE_IN')
		const outBlocks = toList('EXPIRE_OUT')
		if (inBlocks.length) ctx.set('particle_lifetime_expire_in', inBlocks)
		if (outBlocks.length) ctx.set('particle_lifetime_expire_outside', outBlocks)
	},
	decompile(Config) {
		const inputs = {}
		if (Config.particle_lifetime_max_lifetime !== undefined && Config.particle_lifetime_max_lifetime !== null && Config.particle_lifetime_max_lifetime !== '') inputs.MAX_AGE = shadowValue(Config.particle_lifetime_max_lifetime)
		if (Config.particle_lifetime_expiration_expression) inputs.KILL_EXPR = { block: molangToBlockJson(Config.particle_lifetime_expiration_expression) || { type: 'molang_raw', fields: { EXPR: Config.particle_lifetime_expiration_expression } } }
		const fields = {}
		const plane = Config.particle_lifetime_kill_plane
		if (Array.isArray(plane)) {
			fields.KILL_A = plane[0] || 0
			fields.KILL_B = plane[1] || 0
			fields.KILL_C = plane[2] || 0
			fields.KILL_D = plane[3] || 0
		}
		const joinList = (v) => Array.isArray(v) ? v.join(', ') : (v || '')
		if (Config.particle_lifetime_expire_in) fields.EXPIRE_IN = joinList(Config.particle_lifetime_expire_in)
		if (Config.particle_lifetime_expire_outside) fields.EXPIRE_OUT = joinList(Config.particle_lifetime_expire_outside)
		return { fields, inputs }
	},
})

// 文本解析：'evt_a, evt_b' → ['evt_a','evt_b']；'0.0=evt_a\n0.5=evt_b' → {'0.0': ['evt_a'], ...}
function splitIds(text) {
	return (text || '').split(',').map(s => s.trim()).filter(s => s)
}
function parsePairs(text) {
	const obj = {}
	;(text || '').split(/\n|;/).map(s => s.trim()).filter(Boolean).forEach(pair => {
		const m = pair.split('=')
		if (m.length !== 2) return
		const time = m[0].trim(), ids = splitIds(m[1])
		if (!time || !ids.length) return
		obj[time] = ids
	})
	return obj
}
function pairsToText(obj) {
	if (!obj) return ''
	return Object.keys(obj).map(time => {
		const ids = Array.isArray(obj[time]) ? obj[time].join(', ') : String(obj[time])
		return `${time}=${ids}`
	}).join('\n')
}

// ---------------- 发射器事件触发 ----------------
defineModule({
	type: 'emitter_events',
	category: 'events',
	label: '发射器事件',
	register(Blockly) {
		Blockly.Blocks.emitter_events = {
			init() {
				this.appendDummyInput().appendField('发射器事件')
				this.appendDummyInput('CR_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('生成时')
					.appendField(new Blockly.FieldTextInput('my_event'), 'CREATION')
				this.appendDummyInput('EX_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('结束时')
					.appendField(new Blockly.FieldTextInput('my_event'), 'EXPIRATION')
				this.appendDummyInput('TL_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('时间线')
					.appendField(new Blockly.FieldMultilineInput('0.0=my_event'), 'TIMELINE')
				this.appendDummyInput('TD_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('飞行距离')
					.appendField(new Blockly.FieldMultilineInput('5=my_event'), 'TRAVEL')
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('events_block')
				this.setTooltip('发射器事件触发（minecraft:emitter_lifetime_events）。事件名用逗号分隔可触发多个；时间线每行一条：时间=事件名')
			}
		}
	},
	compile(block, ctx) {
		const creation = splitIds(block.getFieldValue('CREATION'))
		const expiration = splitIds(block.getFieldValue('EXPIRATION'))
		if (creation.length) ctx.set('emitter_events_creation', creation)
		if (expiration.length) ctx.set('emitter_events_expiration', expiration)
		const timeline = parsePairs(block.getFieldValue('TIMELINE'))
		if (Object.keys(timeline).length) ctx.set('emitter_events_timeline', timeline)
		const travel = parsePairs(block.getFieldValue('TRAVEL'))
		if (Object.keys(travel).length) ctx.set('emitter_events_distance', travel)
	},
	decompile(Config) {
		const fields = {}
		const cr = Config.emitter_events_creation
		if (cr && (Array.isArray(cr) ? cr.length : String(cr).length)) fields.CREATION = Array.isArray(cr) ? cr.join(', ') : String(cr)
		const ex = Config.emitter_events_expiration
		if (ex && (Array.isArray(ex) ? ex.length : String(ex).length)) fields.EXPIRATION = Array.isArray(ex) ? ex.join(', ') : String(ex)
		if (Config.emitter_events_timeline && Object.keys(Config.emitter_events_timeline).length) fields.TIMELINE = pairsToText(Config.emitter_events_timeline)
		if (Config.emitter_events_distance && Object.keys(Config.emitter_events_distance).length) fields.TRAVEL = pairsToText(Config.emitter_events_distance)
		return { fields, inputs: {} }
	},
})

// ---------------- 粒子事件触发 ----------------
defineModule({
	type: 'particle_events',
	category: 'events',
	label: '粒子事件',
	register(Blockly) {
		Blockly.Blocks.particle_events = {
			init() {
				this.appendDummyInput().appendField('粒子事件')
				this.appendDummyInput('CR_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('生成时')
					.appendField(new Blockly.FieldTextInput('my_event'), 'CREATION')
				this.appendDummyInput('EX_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('消失时')
					.appendField(new Blockly.FieldTextInput('my_event'), 'EXPIRATION')
				this.appendDummyInput('TL_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('时间线')
					.appendField(new Blockly.FieldMultilineInput('0.0=my_event'), 'TIMELINE')
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('events_block')
				this.setTooltip('粒子事件触发（minecraft:particle_lifetime_events）')
			}
		}
	},
	compile(block, ctx) {
		const creation = splitIds(block.getFieldValue('CREATION'))
		const expiration = splitIds(block.getFieldValue('EXPIRATION'))
		if (creation.length) ctx.set('particle_events_creation', creation)
		if (expiration.length) ctx.set('particle_events_expiration', expiration)
		const timeline = parsePairs(block.getFieldValue('TIMELINE'))
		if (Object.keys(timeline).length) ctx.set('particle_events_timeline', timeline)
	},
	decompile(Config) {
		const fields = {}
		const cr = Config.particle_events_creation
		if (cr && (Array.isArray(cr) ? cr.length : String(cr).length)) fields.CREATION = Array.isArray(cr) ? cr.join(', ') : String(cr)
		const ex = Config.particle_events_expiration
		if (ex && (Array.isArray(ex) ? ex.length : String(ex).length)) fields.EXPIRATION = Array.isArray(ex) ? ex.join(', ') : String(ex)
		if (Config.particle_events_timeline && Object.keys(Config.particle_events_timeline).length) fields.TIMELINE = pairsToText(Config.particle_events_timeline)
		return { fields, inputs: {} }
	},
})

// ---------------- 事件定义（顶层积木，三种动作） ----------------
// 产物与 Snowstorm 事件编辑器一致：{particle_effect:{effect,type}} / {sound_effect:{event_name}} / {expression:'...'}
defineModule({
	type: 'event_spawn_particle',
	category: 'events',
	label: '事件：生成粒子',
	topLevel: true,
	register(Blockly) {
		Blockly.Blocks.event_spawn_particle = {
			init() {
				this.appendDummyInput().appendField('事件：生成粒子')
					.appendField(new Blockly.FieldTextInput('my_event'), 'ID')
				this.appendDummyInput('EFF_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('粒子效果')
					.appendField(new Blockly.FieldTextInput('namespace:effect_name'), 'EFFECT')
				this.appendDummyInput('TYPE_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('类型')
					.appendField(new Blockly.FieldDropdown([['发射器', 'emitter'], ['粒子', 'particle']]), 'TYPE')
				this.setStyle('events_block')
				this.setTooltip('定义一个事件：触发时生成粒子效果。把此积木放在工作区空白处，用触发积木（生成时/时间线等）按名字调用')
			}
		}
	},
	compile(block, ctx) {
		const id = (block.getFieldValue('ID') || '').trim()
		const effect = (block.getFieldValue('EFFECT') || '').trim()
		if (!id || !effect) { ctx.warn(block, '事件：生成粒子 缺少事件名或效果名'); return }
		ctx.event(id, { particle_effect: { effect, type: block.getFieldValue('TYPE') } })
	},
})

defineModule({
	type: 'event_play_sound',
	category: 'events',
	label: '事件：播放声音',
	topLevel: true,
	register(Blockly) {
		Blockly.Blocks.event_play_sound = {
			init() {
				this.appendDummyInput().appendField('事件：播放声音')
					.appendField(new Blockly.FieldTextInput('my_event'), 'ID')
				this.appendDummyInput('SND_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('声音')
					.appendField(new Blockly.FieldTextInput('block.bamboo.hit'), 'SOUND')
				this.setStyle('events_block')
				this.setTooltip('定义一个事件：触发时播放声音')
			}
		}
	},
	compile(block, ctx) {
		const id = (block.getFieldValue('ID') || '').trim()
		const sound = (block.getFieldValue('SOUND') || '').trim()
		if (!id || !sound) { ctx.warn(block, '事件：播放声音 缺少事件名或声音名'); return }
		ctx.event(id, { sound_effect: { event_name: sound } })
	},
})

defineModule({
	type: 'event_run_expression',
	category: 'events',
	label: '事件：运行表达式',
	topLevel: true,
	register(Blockly) {
		Blockly.Blocks.event_run_expression = {
			init() {
				this.appendDummyInput().appendField('事件：运行表达式')
					.appendField(new Blockly.FieldTextInput('my_event'), 'ID')
				this.appendDummyInput('EXPR_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('Molang')
					.appendField(new Blockly.FieldMultilineInput('variable.x = 1;'), 'EXPR')
				this.setStyle('events_block')
				this.setTooltip('定义一个事件：触发时运行 Molang 语句（每行一条）')
			}
		}
	},
	compile(block, ctx) {
		const id = (block.getFieldValue('ID') || '').trim()
		const expr = (block.getFieldValue('EXPR') || '').trim()
		if (!id || !expr) { ctx.warn(block, '事件：运行表达式 缺少事件名或表达式'); return }
		ctx.event(id, { expression: expr })
	},
})

// ---------------- 高级逻辑（变量与表达式） ----------------
defineModule({
	type: 'advanced_logic',
	category: 'advanced',
	label: '高级逻辑',
	register(Blockly) {
		Blockly.Blocks.advanced_logic = {
			init() {
				this.appendDummyInput().appendField('高级逻辑')
				this.appendDummyInput('SV_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('初始变量')
					.appendField(new Blockly.FieldMultilineInput('variable.size = 1;'), 'START_VARS')
				this.appendDummyInput('TV_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('每帧变量')
					.appendField(new Blockly.FieldMultilineInput('variable.dist = variable.size*2;'), 'TICK_VARS')
				this.appendDummyInput('PU_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('粒子更新')
					.appendField(new Blockly.FieldMultilineInput('variable.particle_x = variable.particle_x + 1;'), 'UPDATE_EXPR')
				this.appendDummyInput('PR_ROW').setAlign(Blockly.inputs.Align.RIGHT).appendField('粒子渲染')
					.appendField(new Blockly.FieldMultilineInput('variable.yaw = Math.atan2(variable.particle_velocity_x, variable.particle_velocity_z);'), 'RENDER_EXPR')
				this.setPreviousStatement(true, 'Module')
				this.setNextStatement(true, 'Module')
				this.setStyle('variable_blocks')
				this.setTooltip('自定义 Molang 变量与每帧更新/渲染表达式（variables_* / particle_update_expression / particle_render_expression）。每行一条语句')
			}
		}
	},
	compile(block, ctx) {
		const toStatements = (field) => (block.getFieldValue(field) || '').split(/\n|;/).map(s => s.trim()).filter(s => s)
		const startVars = toStatements('START_VARS')
		const tickVars = toStatements('TICK_VARS')
		const updateExpr = toStatements('UPDATE_EXPR')
		const renderExpr = toStatements('RENDER_EXPR')
		if (startVars.length) ctx.set('variables_creation_vars', startVars)
		if (tickVars.length) ctx.set('variables_tick_vars', tickVars)
		if (updateExpr.length) ctx.set('particle_update_expression', updateExpr)
		if (renderExpr.length) ctx.set('particle_render_expression', renderExpr)
	},
	decompile(Config) {
		const joinStatements = (v) => Array.isArray(v) ? v.join(';\n') : (v || '')
		const fields = {}
		if (Config.variables_creation_vars && Config.variables_creation_vars.length) fields.START_VARS = joinStatements(Config.variables_creation_vars)
		if (Config.variables_tick_vars && Config.variables_tick_vars.length) fields.TICK_VARS = joinStatements(Config.variables_tick_vars)
		if (Config.particle_update_expression && Config.particle_update_expression.length) fields.UPDATE_EXPR = joinStatements(Config.particle_update_expression)
		if (Config.particle_render_expression && Config.particle_render_expression.length) fields.RENDER_EXPR = joinStatements(Config.particle_render_expression)
		return { fields, inputs: {} }
	},
})

export function registerModuleBlocks(Blockly) {
	for (const def of ModuleRegistry) def.register(Blockly)
}
