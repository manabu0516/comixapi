const fs = require('fs').promises;
const pathModule = require('path');

const targetDir = process.argv[2];

console.log('command : rename, targetdir=' + targetDir);

const run = async () => {

    const data = await fs.readdir(targetDir);
    for (let idx = 0; idx < data.length; idx++) {
        const element = data[idx];

        const res = element.replace(/[^0-9]/g, '');
        const padNum = ('0000' + res).slice(-4);
        const extention = pathModule.extname(element);
        const filename = padNum + extention;

        console.log('rename :' + element + ' => ' + filename);
        await fs.rename(pathModule.join(targetDir, element), pathModule.join(targetDir, filename));
    }
};

run();