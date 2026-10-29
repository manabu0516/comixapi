module.exports = async () => {
    const sharp = require('sharp');
    const path = require('path');
    const fs = require('fs/promises');

    const split_image_file = async (fname) => {
        const ext = path.extname(fname);
        const base = path.basename(fname, ext);
        const dir = path.dirname(fname);

        const p1 = path.join(dir, base + '_01' + ext);
        const p2 = path.join(dir, base + '_02' + ext);

        const image = sharp(fname);
        const metadata = await image.metadata();
        const { width, height } = metadata;

        const halfWidth = Math.floor(width / 2);
        await image.clone().extract({
                left: halfWidth,
                top: 0,
                width: width - halfWidth ,
                height: height
            }).toFile(p1);

        await image.clone().extract({
                left: 0,
                top: 0,
                width: halfWidth,
                height: height
            }).toFile(p2);

        await fs.unlink(fname);
        return [p1, p2];
    };

    const split_image_files = async (files, event) => {
        const result = [];

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const r = await split_image_file(f);
            r.forEach(e => result.push(e));
        }
        return result;
    };

    return {name : 'splitimage', type : 'filedata', handler : split_image_files};
};