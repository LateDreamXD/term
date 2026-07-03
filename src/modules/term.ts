import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

const term = new Terminal({
	convertEol: true,
	fontFamily: '"Cascadia Mono", "Lucida Console", "Courier New", Consolas, Menlo, monospace'
});

const fitAddon = new FitAddon();

term.loadAddon(fitAddon);

export const useTerm = () => term;
export const useFit = () => fitAddon;

export default {
	useTerm,
	useFit
}