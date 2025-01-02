#!/usr/bin/env node

import { program } from 'commander'; // or you can just skip Commander and run directly
import { runCli } from './prompts';

// Set up Commander (optional)
program.name('image-grid-cli').description('CLI to create a single image grid from many date-named images.').version('1.0.0');

program.parse(process.argv);

// Run the interactive CLI
runCli().catch((error: unknown) => {
	console.error('An error occurred:', error);
	process.exit(1);
});
