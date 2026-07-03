import { type Terminal } from '@xterm/xterm';
import { type FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { ref } from 'vue';

const cmdInput = ref('');

export const cmds = [
	['about', 'Display about info.'],
	['help', 'Display this message.'],
	['motd', 'Show message of the day.'],
	['clear', 'Clean screen.'],
	['whoami', 'Show current username.'],
	['ls', 'List cwd.'],
	['load', 'Load specified file(s).'],
	['unload', 'Unload specified file(s).'],
	['save', 'Save specified file(s).'],
	['ffmpeg', 'You know it.'],
	['ffprobe', 'You know it, right?'],
	['version', 'Display version.']
];

export const commands: Record<string, Function> = {
	async about(term: Terminal) {
		const { useAbout } = await import('./about');
		term.writeln(useAbout());
	},
	motd(term: Terminal) {
		term.writeln(`\n    Hi, welcome to ${color(document.title, 94)}!\n`);
	},
	help(term: Terminal) {
		term.writeln('\nListed available commands:\n');
		cmds.forEach(([cmd, desc]) => {
			term.writeln(`  ${color(cmd, 96)}     \t${desc}`);
		});
	},
	clear(term: Terminal) {
		term.reset();
	},
	whoami(term: Terminal) {
		term.writeln('guest');
	},
	async ls(term: Terminal, ffmpeg: FFmpeg) {
		term.writeln('');
		(await ffmpeg.listDir('/')).forEach(node => {
			if(node.name === '.' || node.name === '..') return;
			term.write(`${node.name}\t`);
		});
		term.writeln('');
	},
	load(term: Terminal, ffmpeg: FFmpeg) {
		return new Promise((resolve, reject) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '*';
			input.multiple = true;
			input.onchange = async() => {
				const files = input.files;
				if(!files || files.length === 0)
					return reject('user canceled');
				for(let i = 0; i < files.length; i++) {
					const file = files[i];
					const filename = file.name.replace(/\s/g, '.');
					await ffmpeg.writeFile(filename, await fetchFile(file));
					term.writeln(`File \`${filename}\` loaded.`);
				}
				input.remove();
				return resolve(true);
			}
			input.click();
		});
	},
	async unload(term: Terminal, ffmpeg: FFmpeg, args: string[]) {
		if(!args || args.length === 0) return;
		for(const name of args) {
			await ffmpeg.deleteFile(name);
			term.writeln(`File ${name} unloaded.`);
		}
	},
	async ffmpeg(term: Terminal, ffmpeg: FFmpeg, args: string[]) {
		if(!args || args.length === 0) return;
		await ffmpeg.exec(args);
	},
	async ffprobe(term: Terminal, ffmpeg: FFmpeg, args: string[]) {
		if(!args || args.length === 0) return;
		await ffmpeg.ffprobe(args);
	},
	async save(term: Terminal, ffmpeg: FFmpeg, args: string[]) {
		if(!args || args.length === 0) return;
		for(const name of args) {
			const a = document.createElement('a');
			a.download = name;
			const data = await ffmpeg.readFile(name);
			console.log(data);
			// @ts-ignore
			// official demo just like this, so ignore
			a.href = URL.createObjectURL(new Blob([data.buffer], { type: data.type }));
			a.click();
			URL.revokeObjectURL(a.href);
			a.remove();
			term.writeln(`File \`${name}\` pushed.`);
		}
	},
	async version(term: Terminal) {
		const versions = (await import('./versions')).default;
		term.writeln(JSON.stringify(versions, null, 2));
	}
}

export const color = (str: string, code: number | string) => `\x1b[${code}m${str}\x1b[0m`;

export const enter = (term: Terminal) => {
	term.write(`guest@${color('term', 94)}> `);
}

export const execute = async(term: Terminal, ffmpeg: FFmpeg, cmd?: string) => {
	cmd = cmd || cmdInput.value;
	if(cmd.length === 0) return;
	const args = cmd.trim().split(' ');
	if(!cmds.join(',').includes(args[0])) {
		term.writeln(`${args[0]}: command not found`);
		return;
	}
	try {
		await commands[args[0]]?.(term, ffmpeg, args.slice(1));
	} catch(e) {
		console.error(e);
		term.writeln(`${String(e)}`);
	}
}

export const initHook = (term: Terminal, ffmpeg: FFmpeg) => {
	term.onData(async(data) => {
		switch(data) {
			case '\r':
				term.writeln('');
				await execute(term, ffmpeg).finally(() => {
					cmdInput.value = '';
					term.writeln('');
					enter(term);
				});
				break;
			case '\x7f':
				if(cmdInput.value.length > 0) {
					cmdInput.value = cmdInput.value.slice(0, -1);
					term.write('\b \b');
				}
				break;
			default:
				if(data >= ' ' && data <= '~') { // characters that can be print
					cmdInput.value += data;
					term.write(data);
				}
		}
	});
}

export const loading = (term: Terminal, content?: string) => {
	const spinner = ['|', '/', '-', '\\'];
	let i = 0;
	content = content? ` Loading ${content}...`: ' Loading...';
	const interval = setInterval(() => {
		term.write(`\r${spinner[i++ % spinner.length] + content} `);
	}, 100);
	return () => clearInterval(interval);
}

export default commands;