import fg from 'fast-glob';
import path from 'path';

/**
 * Recursively searches the given directory for images
 * matching the selected extensions (e.g., ['.jpg','.png']).
 */
export async function searchForImages(directory: string, extensions: string[]): Promise<string[]> {
	const patterns = extensions.map((ext) => `**/*${ext}`);
	const options = {
		cwd: directory,
		absolute: true,
		caseSensitiveMatch: false,
		onlyFiles: true,
	};

	// fast-glob can accept an array of patterns
	const files = await fg(patterns, options);

	// Filter only those that match yyyymmdd*.ext (basic check).
	// Adjust the regex as needed if your naming could vary more.
	const dateRegex = /^[0-9]{8}.*\.(jpg|jpeg|png)$/i;

	const matched = files.filter((file) => {
		const base = path.basename(file);
		return dateRegex.test(base);
	});

	return matched;
}
