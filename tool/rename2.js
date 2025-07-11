const fs = require('fs').promises;
const pathModule = require('path');

const targetDir = process.argv[2];

console.log('command : rename, targetdir=' + targetDir);

const run = async () => {

    const data = await fs.readdir(targetDir);
    for (let idx = 0; idx < data.length; idx++) {
        const element = data[idx];

        const padNum = ('0000' + (idx+1)).slice(-4);
        const extention = pathModule.extname(element);
        const filename = 'p' + padNum + extention;

        console.log('rename :' + element + ' => ' + filename);
        await fs.rename(pathModule.join(targetDir, element), pathModule.join(targetDir, filename));
    }
};

run();