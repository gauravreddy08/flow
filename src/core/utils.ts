import fs from 'fs';
import path from 'path';

export function getFiles(rootDir: string) : string[] {
    let results: string[] = [];

    try {
        const files = fs.readdirSync(rootDir)
        if(files.length===0) {
            results.push(rootDir)
            return results
        }

        for (const file of files) {
            const filePath = path.join(rootDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
              results = results.concat(getFiles(filePath));
            } else {
              results.push(filePath);
            }
        }
        return results
    }
    catch (error) {
        throw new Error("Directory not found");
    }
}




export function write_file(filepath: string, content: string) {
    const absolutePath = path.resolve(filepath);
    const dirname = path.dirname(absolutePath);

    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
    }

    fs.writeFileSync(absolutePath, content);
}
