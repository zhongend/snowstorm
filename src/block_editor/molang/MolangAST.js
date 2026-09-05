// Molang AST：解析器（Molang 字符串 → AST）与序列化器（AST → Molang 字符串）。
// 支持官方语法子集：数字 / 变量(variable.*, temp.*, query.* 等) / 布尔 / 一元-+
// 二元算术·比较·逻辑 / 三元条件 / 函数调用 math.x(...)。
// 解析失败返回 null —— 调用方必须回退到 Raw Molang Block，绝不丢弃表达式。

// AST 节点形态：
//   {type:'number', value}
//   {type:'variable', name}      // variable./temp./query./context./this/true/false
//   {type:'unary', op, arg}
//   {type:'binary', op, left, right}   // op: + - * / % < <= > >= == != && ||
//   {type:'conditional', cond, then, else}
//   {type:'call', fn, args}

const TOKEN_RE = /\s*(?:(\d+\.\d+|\d+\.|\.\d+|\d+)|([A-Za-z_][A-Za-z0-9_.]*)|(==|!=|<=|>=|&&|\|\||[-+*/%<>?:(),]))/y

export function tokenize(src) {
	let tokens = [], pos = 0, m
	TOKEN_RE.lastIndex = 0
	while (pos < src.length) {
		TOKEN_RE.lastIndex = pos
		m = TOKEN_RE.exec(src)
		if (!m || m.index !== pos) {
			if (src.slice(pos).trim() === '') break
			return null
		}
		pos = TOKEN_RE.lastIndex
		if (m[1]) tokens.push({ t: 'num', v: parseFloat(m[1]) })
		else if (m[2]) tokens.push({ t: 'ident', v: m[2] })
		else tokens.push({ t: 'op', v: m[3] })
	}
	return tokens
}

export function parseMolang(src) {
	if (typeof src !== 'string') return null
	const tokens = tokenize(src.trim().replace(/;\s*$/, ''))
	if (!tokens || !tokens.length) return null
	let i = 0
	const peek = () => tokens[i]
	const eat = (v) => { if (peek() && peek().t === 'op' && peek().v === v) { i++; return true } return false }
	const isOp = (...vs) => peek() && peek().t === 'op' && vs.includes(peek().v)

	function parsePrimary() {
		const tk = peek()
		if (!tk) return null
		if (tk.t === 'num') { i++; return { type: 'number', value: tk.v } }
		if (tk.t === 'ident') {
			i++
			let name = tk.v
			// 布尔字面量
			if (name === 'true') return { type: 'number', value: 1 }
			if (name === 'false') return { type: 'number', value: 0 }
			// 函数调用
			if (peek() && peek().t === 'op' && peek().v === '(') {
				i++
				const args = []
				if (!eat(')')) {
					while (true) {
						const a = parseExpression()
						if (!a) return null
						args.push(a)
						if (eat(',')) continue
						if (eat(')')) break
						return null
					}
				}
				return { type: 'call', fn: name, args }
			}
			// 变量：variable.x / query.x / math.pi 已在 ident 中带点
			return { type: 'variable', name }
		}
		if (tk.t === 'op' && tk.v === '(') {
			i++
			const e = parseExpression()
			if (!e || !eat(')')) return null
			return e
		}
		if (tk.t === 'op' && (tk.v === '-' || tk.v === '+')) {
			i++
			const a = parseUnary()
			if (!a) return null
			return tk.v === '-' ? { type: 'unary', op: '-', arg: a } : a
		}
		return null
	}
	function parseUnary() { return parsePrimary() }
	function parseBinary(minPrec) {
		let left = parseUnary()
		if (!left) return null
		const prec = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 }
		while (isOp(...Object.keys(prec))) {
			const op = peek().v
			if (prec[op] < minPrec) break
			i++
			const right = parseBinary(prec[op] + 1)
			if (!right) return null
			left = { type: 'binary', op, left, right }
		}
		return left
	}
	function parseExpression() {
		const cond = parseBinary(1)
		if (!cond) return null
		if (eat('?')) {
			const thenE = parseExpression()
			if (!thenE || !eat(':')) return null
			const elseE = parseExpression()
			if (!elseE) return null
			return { type: 'conditional', cond, then: thenE, else: elseE }
		}
		return cond
	}
	const ast = parseExpression()
	if (!ast || i !== tokens.length) return null
	return ast
}

// 纯数字字符串（如 "30"）快速判断
export function parseNumeric(src) {
	if (typeof src === 'number') return src
	if (typeof src === 'string' && /^-?\d+(\.\d+)?$/.test(src.trim())) return parseFloat(src)
	return null
}

// 序列化：AST → Molang 字符串（按优先级加括号）
const PREC = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '<=': 4, '>': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 }
function serialize(node, parentPrec = 0) {
	switch (node.type) {
		case 'number': {
			let v = node.value
			let s = (typeof v === 'number') ? String(v) : v
			if (/^-?\d+$/.test(s)) s += '.0'   // Molang 浮点习惯：整数带 .0（仅在表达式中）
			return s
		}
		case 'variable': return node.name
		case 'unary': return '-' + serialize(node.arg, 7)
		case 'binary': {
			const p = PREC[node.op]
			let s = serialize(node.left, p) + node.op + serialize(node.right, p + 1)
			return p < parentPrec ? `(${s})` : s
		}
		case 'conditional': {
			const s = serialize(node.cond, 1) + '?' + serialize(node.then, 1) + ':' + serialize(node.else, 1)
			return parentPrec > 0 ? `(${s})` : s
		}
		case 'call': return node.fn + '(' + node.args.map(a => serialize(a, 0)).join(',') + ')'
		default: return '0'
	}
}

export function serializeMolang(node) {
	let s = serialize(node, 0)
	// 顶层纯数字直接返回（由调用方决定是否需要 .0）
	return s
}

// 纯数字判断：AST 只是数字节点时返回数值（顶层不加 .0）
export function tryNumber(ast) {
	if (ast && ast.type === 'number') return ast.value
	return null
}
