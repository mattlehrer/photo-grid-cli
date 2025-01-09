import fg from 'fast-glob';
import path from 'path';
import chalk from 'chalk';

/**
 * Recursively searches the given directory for images
 * matching the selected extensions (e.g. ['.jpg','.jpeg','.png']).
 * Must match the pattern: yyyymmdd*.ext
 *
 * If the same base filename appears in multiple directories,
 * the duplicates are skipped (only the first is kept).
 */
export async function searchForImages(directory: string, extensions: string[]): Promise<string[]> {
	// Build glob patterns for each extension.
	const patterns = extensions.map((ext) => `**/*${ext}`);
	const options = {
		cwd: directory,
		absolute: true,
		caseSensitiveMatch: false,
		onlyFiles: true,
	};

	// 1. Gather all possible files in the directory tree
	const allFoundFiles = await fg(patterns, options);

	// 2. Filter only those that match yyyymmdd*.ext
	const dateRegex = /^[0-9]{8}.*\.(jpg|jpeg|png)$/i;
	const matchedFiles = allFoundFiles.filter((file) => {
		const base = path.basename(file);
		return dateRegex.test(base);
	});

	// 3. Track the first occurrence of each basename
	//    and collect duplicates to skip
	const seenBasenames = new Map<string, string>(); // basename -> absolute path (first occurrence)
	const duplicates: string[] = [];

	for (const filePath of matchedFiles) {
		const base = path.basename(filePath).toLowerCase();

		if (!seenBasenames.has(base)) {
			// first time we see this basename
			seenBasenames.set(base, filePath);
		} else {
			// additional occurrence -> consider a duplicate
			duplicates.push(filePath);
		}
	}

	// 4. Notify user about duplicates and skip them
	if (duplicates.length > 0) {
		console.log(chalk.yellow('\nDuplicate filenames detected (these will be skipped):'));
		duplicates.forEach((dup) => console.log(chalk.yellow(dup)));
		console.log();
	}

	// 5. Return only the unique files (the first instance of each basename)
	return [...seenBasenames.values()];
}
