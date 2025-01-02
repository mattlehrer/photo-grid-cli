import { spawn } from 'child_process';
import path from 'path';

interface MontageOptions {
	files: string[];
	imagesPerRow: number;
	resolution: string; // e.g. "64x48"
	outputFile: string;
}

/**
 * Creates the final image grid using ImageMagick's 'montage' command.
 * - No border/gap between images
 * - White background to fill any missing slots in the bottom row
 */
export async function createMontage(options: MontageOptions): Promise<void> {
	const { files, imagesPerRow, resolution, outputFile } = options;

	// Build arguments for `montage`
	// Example:
	// montage file1 file2 ... -tile Nx -geometry 64x48+0+0 -background white out.jpg
	const tileArg = `${imagesPerRow}x`; // Let montage decide # of rows
	const geometryArg = `${resolution}+0+0`; // no spacing

	const args = [
		...files,
		'-tile',
		tileArg,
		'-geometry',
		geometryArg,
		'-background',
		'white',
		// remove borders
		'+frame',
		'+shadow',
		'+label',
		outputFile,
	];

	await runCommand('montage', args);
}

/**
 * Spawns a child process and resolves or rejects
 * based on process exit code.
 */
function runCommand(command: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: 'inherit' });

		child.on('error', (error) => {
			reject(error);
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`${command} exited with code ${code}`));
			}
		});
	});
}
