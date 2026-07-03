<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue';
import { useFit, useTerm } from './modules/term';
import cmds, { color, enter, initHook, loading } from './modules/cmds';
import { useFFmpeg } from './modules/ffmpeg';

const terminal = useTemplateRef('terminal');
const fitAddon = useFit();
const term = useTerm();
const ffmpeg = useFFmpeg();

onMounted(async() => {
	// mount term
	term.open(terminal.value!);
	fitAddon.fit();

	// show motd
	cmds.motd(term);

	// init ffmpeg
	const close = loading(term, 'ffmpeg');
	await ffmpeg.load().then(loaded => {
		if(loaded) {
			close();
			term.clearSelection();
			term.writeln(`\r${color('√', 92)} ffmpeg loaded.\n`);

			ffmpeg.on('log', ({ type, message }) => {
				if(message.startsWith('ffmpeg')) term.writeln('');
				term.writeln(`${message}`);
				console.log(`${type} ${message}`);
			});
		}
	});

	// show input
	enter(term);

	// foucus term and listen keyboard
	term.focus();
	initHook(term, ffmpeg);
});
onUnmounted(() => {
	term.dispose();
});
</script>

<template>
	<div class="terminal" ref="terminal"></div>
</template>

<style>
.terminal {
	height: 100%;
}
</style>