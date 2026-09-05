// Scratch / TurboWarp 风格主题（Snowstorm + Minecraft 配色）
import * as Blockly from 'blockly'
import { CATEGORY_COLORS } from '../blocks/modules'

export function createTheme() {
	return Blockly.Theme.defineTheme('snowstorm_blocks', {
		base: Blockly.Themes.Classic,
		componentStyles: {
			workspaceBackgroundColour: '#f6f8fb',
			toolboxBackgroundColour: '#ffffff',
			toolboxForegroundColour: '#333333',
			flyoutBackgroundColour: '#eef1f6',
			flyoutForegroundColour: '#555555',
			flyoutOpacity: 1,
			scrollbarColour: '#c4cdd8',
			scrollbarOpacity: 0.5,
			insertionMarkerColour: '#4C97FF',
			insertionMarkerOpacity: 0.5,
			cursorColour: '#4C97FF',
		},
		fontStyle: { family: '"Segoe UI", "Microsoft YaHei", sans-serif', size: 12 },
		blockStyles: {
			root_block:      { colourPrimary: CATEGORY_COLORS.root },
			emitter_block:    { colourPrimary: CATEGORY_COLORS.emitter },
			shape_block:      { colourPrimary: CATEGORY_COLORS.shape },
			lifetime_block:   { colourPrimary: CATEGORY_COLORS.lifetime },
			motion_block:     { colourPrimary: CATEGORY_COLORS.motion },
			appearance_block: { colourPrimary: CATEGORY_COLORS.appearance },
			color_block:      { colourPrimary: CATEGORY_COLORS.color },
			texture_block:    { colourPrimary: CATEGORY_COLORS.texture },
			collision_block:  { colourPrimary: CATEGORY_COLORS.collision },
			space_block:      { colourPrimary: CATEGORY_COLORS.space },
			events_block:     { colourPrimary: '#E5565B' },
			curve_block:      { colourPrimary: '#F2C94C' },
			math_block:       { colourPrimary: '#4C97FF' },
			molang_block:     { colourPrimary: '#59C059' },
			molang_fn_block:  { colourPrimary: '#40BF4E' },
			variable_blocks:  { colourPrimary: '#FF8C1A' },
			operator_blocks:  { colourPrimary: '#5C81A6' },
		},
	})
}
