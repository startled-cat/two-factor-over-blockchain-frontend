const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require('webpack');

module.exports = {
	mode: "development",

	entry: {
		bundle: path.resolve(__dirname, "src/index.js"),
	},
	resolve: {
		extensions: ['.ts', '.js'],

		fallback: {
			"url": require.resolve("url/"),
			"https": require.resolve("https-browserify"),
			"http": require.resolve("stream-http"),
			// "crypto": require.resolve("crypto-browserify"),
			"os": require.resolve("os-browserify/browser"),
			"assert": require.resolve("assert/"),
			"stream": require.resolve("stream-browserify"),
			"buffer": require.resolve("buffer")
		}
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "[name].[contenthash].js",
		clean: true,
		assetModuleFilename: 'images/[hash][ext][query]',
	},
	devtool: "source-map",
	devServer: {
		static: {
			directory: path.resolve(__dirname, "dist"),
		},
		port: 3002,
		open: true,
		hot: true,
		compress: true,
		historyApiFallback: true,

	},
	module: {
		rules: [
			{
				test: /\.scss$/,
				use: [
					"style-loader",
					"css-loader",
					"sass-loader"
				]
			},
			{
				test: /\.(png|svg|jpg|jpeg|gif)$/i,
				type: "asset/inline",
			}
		]
	},
	plugins: [
		new HtmlWebpackPlugin({
			title: "Web App (using BlockAuthenticator)",
			filename: "index.html",
			template: "src/template.html"
		}),

		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify('development'),
				DEBUG: JSON.stringify(true)
			}
		}),
		new webpack.ProvidePlugin({
			Buffer: ['buffer', 'Buffer'],
		}),
		new webpack.ProvidePlugin({
			process: 'process/browser',
		}),

	]
}