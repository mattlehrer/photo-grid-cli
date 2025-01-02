import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { searchForImages } from './fileSearch';
import { createMontage } from './montageBuilder';

/**
 * Runs the interactive prompts and orchestrates the steps.
 */
export async function runCli(): Promise<void> {
	// 1. Ask if the user is in the correct directory
	const { correctDir } = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'correctDir',
			message: 'Are you currently in the directory with the photos?',
			default: true,
		},
	]);

	let workingDir: string = process.cwd();
	if (!correctDir) {
		const { chosenDir } = await inquirer.prompt([
			{
				type: 'input',
				name: 'chosenDir',
				message: 'Please enter the directory path where the photos are located:',
				validate: (input: string) => {
					if (!fs.existsSync(input)) {
						return `Directory "${input}" does not exist.`;
					}
					const stats = fs.statSync(input);
					if (!stats.isDirectory()) {
						return `"${input}" is not a directory.`;
					}
					return true;
				},
			},
		]);
		workingDir = path.resolve(chosenDir);
	}

	// 2. Ask user which image extensions to include
	const { extensions } = await inquirer.prompt<{ extensions: string[] }>({
		type: 'checkbox',
		name: 'extensions',
		message: 'Select the image extensions to include (at least one):',
		choices: [
			{ name: '.jpg', value: '.jpg' },
			{ name: '.jpeg', value: '.jpeg' },
			{ name: '.png', value: '.png' },
		],
		validate: (answer: any) => {
			if (!Array.isArray(answer) || answer.length < 1) {
				return 'You must choose at least one extension.';
			}
			return true;
		},
	});

	console.log(chalk.cyan(`\nAll files should be in yyyymmdd*.{ext} format.\n`));

	// 3. Search for images recursively
	const foundImages = await searchForImages(workingDir, extensions);

	if (foundImages.length === 0) {
		console.log(chalk.red('No images found matching the given extensions.'));
		return;
	}

	// 4. Parse file names for dates, find earliest + latest date
	//    Also gather stats about total number of files, day range, etc.
	const parsedData = parseDates(foundImages);
	const { sortedFiles, earliestDate, latestDate } = parsedData;

	const numberOfDays = dayDifference(earliestDate, latestDate);
	console.log(chalk.green(`Found a total of ${sortedFiles.length} images.`));
	console.log(chalk.green(`Earliest date: ${earliestDate.toISOString().slice(0, 10)}`));
	console.log(chalk.green(`Latest date:   ${latestDate.toISOString().slice(0, 10)}`));
	console.log(chalk.green(`Number of days: ${numberOfDays}\n`));

	// 5. Ask how many images per row
	const { imagesPerRow } = await inquirer.prompt([
		{
			type: 'input',
			name: 'imagesPerRow',
			message: 'How many images should be in each row?',
			default: '25',
			validate: (input: string) => {
				const val = parseInt(input, 10);
				if (isNaN(val) || val <= 0) {
					return 'Please enter a valid positive integer.';
				}
				return true;
			},
		},
	]);
	const imagesPerRowNum = parseInt(imagesPerRow, 10);
	const rowEstimate = Math.ceil(sortedFiles.length / imagesPerRowNum);

	console.log(chalk.cyan(`\nWith ${imagesPerRowNum} images per row, you would have approximately ${rowEstimate} rows.\n`));

	// 6. Ask for the output resolution of each photo
	const { chosenResolution } = await inquirer.prompt([
		{
			type: 'list',
			name: 'chosenResolution',
			message: 'Select the resolution of each photo in the output grid:',
			choices: ['64x48', '120x90', '160x120', '320x240'],
			default: '64x48',
		},
	]);

	// 7. Ask for output file name and type
	const { outputName, outputType } = await inquirer.prompt([
		{
			type: 'input',
			name: 'outputName',
			message: 'Enter a name for the output file (without extension):',
			default: 'image-grid',
		},
		{
			type: 'list',
			name: 'outputType',
			message: 'Choose output image format:',
			choices: ['.jpg', '.png'],
			default: '.jpg',
		},
	]);

	const outputFile = path.resolve(workingDir, `${outputName}${outputType}`);
	console.log(chalk.cyan(`\nCreating image grid: ${outputFile}\n`));

	try {
		// 8. Create the montage
		await createMontage({
			files: sortedFiles,
			imagesPerRow: imagesPerRowNum,
			resolution: chosenResolution,
			outputFile,
		});
		console.log(chalk.green(`Success! Created output file at: ${outputFile}`));
	} catch (err) {
		console.error(chalk.red('Error while creating montage:'), err);
	}
}

/**
 * Parse filenames for dates (assuming yyyymmdd*.ext format).
 * Returns sorted files plus earliest & latest date found.
 */
function parseDates(filePaths: string[]) {
	// We'll collect { filePath, date } so we can sort easily
	const items = filePaths.map((fp) => {
		const base = path.basename(fp);
		// Example: 20210101_something.jpg => yyyymmdd = first 8 chars
		const dateStr = base.slice(0, 8); // "20210101"
		let dateVal: Date;
		try {
			const year = parseInt(dateStr.slice(0, 4));
			const month = parseInt(dateStr.slice(4, 6)) - 1; // zero-based
			const day = parseInt(dateStr.slice(6, 8));
			dateVal = new Date(year, month, day);
		} catch {
			// fallback to something
			dateVal = new Date(0);
		}
		return { fp, dateVal };
	});

	// Sort by dateVal ascending
	items.sort((a, b) => a.dateVal.getTime() - b.dateVal.getTime());

	const sortedPaths = items.map((el) => el.fp);
	const earliestDate = items[0].dateVal;
	const latestDate = items[items.length - 1].dateVal;

	return { sortedFiles: sortedPaths, earliestDate, latestDate };
}

/**
 * Day difference between two Date objects
 */
function dayDifference(d1: Date, d2: Date): number {
	const diffMs = d2.getTime() - d1.getTime();
	return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
