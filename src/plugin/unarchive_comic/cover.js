module.exports = async () => {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs/promises');

    const convert_image = async (fname, files) => {
        const ext = path.extname(fname);
        const dir = path.dirname(fname);
        const outputPath =  path.join(dir, '0000_cover' + ext);

        await sharp(fname)
            .trim({ lineOutset: 5 }).toFile(outputPath);

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            await fs.unlink(f);
        }
        return [outputPath];
    };

    const context = {first : false};

    const trim_image_cover = async (files) => {
        if(context.first === false) {
            context.first = true;
            return convert_image(files[0], files);
        }
        return files;
    };

    return {name : 'cover', type : 'filedata', handler : trim_image_cover};
};