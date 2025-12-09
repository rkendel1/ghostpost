import dotenv from 'dotenv';
dotenv.config();

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';
import svg from '@poppanator/sveltekit-svg';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

/** @type {import('vite').UserConfig} */
export default defineConfig({
	plugins: [
		sveltekit(),
		svg({
			includePaths: ['./src/lib/images'],
			svgoOptions: {
				multipass: true,
				plugins: [
					{
						name: 'preset-default',
						params: {
							overrides: {
								removeViewBox: false
							}
						}
					},
					{
						name: 'removeAttrs',
						params: {
							attrs: '(stroke|fill)'
						}
					}
				]
			}
		}),
		wasm(),
		topLevelAwait()
	],
	server: {
		fs: {
			// Allow serving files from one level up to the project root
			allow: ['..'],
			deny: ['.git', '.svn', '.cache', '.idea', '.vs', '.vscode', 'node_modules', '.github']
		}
	},
	optimizeDeps: {
		exclude: ['wasm-bindgen-module']
	}
});
