module.exports = async () => {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs/promises');

    const trim_image_file = async (fname) => {
        const ext = path.extname(fname);
        const base = path.basename(fname, ext);
        const dir = path.dirname(fname);

        const outputPath =  path.join(dir, base + 't' + ext);
        await sharp(fname)
            .trim({ lineOutset: 5 }).toFile(outputPath);

        await fs.unlink(fname);
        return outputPath;
    };

    const trim_image_files = async (files) => {
        const result = [];

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if(f.indexOf('0000_cover') !== -1) {
                result.push(f);
                continue;
            }
            
            const r = await trim_image_file(f);
            result.push(r);
        }

        return result;
    };

    return {name : 'trimimage', type : 'filedata', handler : trim_image_files};
};