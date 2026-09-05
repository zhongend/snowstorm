let mix = require('laravel-mix');
let path = require('path');
let fs = require('fs');
let {WebpackBundleSizeAnalyzerPlugin} = require('webpack-bundle-size-analyzer');
const {DefinePlugin} = require('webpack')

process.argv.push('--https')

let alias = {
	'three/examples/jsm/controls/OrbitControls.js': path.join(__dirname, 'node_modules/three/examples/jsm/controls/OrbitControls.js'),
	'three': path.join(__dirname, 'node_modules/three/build/three.module.js'),
	'wintersky': path.join(__dirname, 'node_modules/wintersky/dist/wintersky.esm.js')
}
if (process.env.NODE_ENV == 'development' && __dirname.includes('snowstorm\\snowstorm')) {
	alias['wintersky'] = path.join(__dirname, './../wintersky/dist/wintersky.esm.js')
}

mix.webpackConfig({
    module: {
        rules: [
			{
				test: /\.png/,
				type: 'asset/inline',
				generator: {
					dataUrl: content => {
						let path = './dist' + content.toString().split('"')[1].replace(/\?.*/, '');
						let base64 = require('fs').readFileSync(path, {encoding: 'base64'});
						return 'data:image/png;base64,' + base64;
					}
				}
			}
		],
	},
	resolve: {
		extensions: ['.js'],
		modules: ['node_modules'],
		alias
	},
	plugins: [
        new DefinePlugin({
            VERSION: `"${require('./package.json').version}"`
        }),
		new WebpackBundleSizeAnalyzerPlugin('./plain-report.txt')
	],
	devServer: {
		contentBase: path.join(__dirname, 'dist'),
		port: 3000,
		open: true
	}
});

mix.js('src/app.js', 'dist/')
	.vue()
	.setPublicPath('dist')
	// Blockly 图标/音效资源自托管：不传 media 选项时 Blockly 会指向
	// blockly-demo.appspot.com（国内不可达），导致垃圾桶/缩放按钮图标损坏。
	.copy('node_modules/blockly/media', 'dist/media')
	.after(() => {
		fs.copyFileSync('./dist/app.js', './vscode_extension/snowstorm/app.js')
		fs.cpSync('./node_modules/blockly/media', './vscode_extension/snowstorm/media', {recursive: true})
	});
