const fs = require('fs').promises;
const pathModule = require('path');

const targetDir = process.argv[2];

console.log('command : rename, targetdir=' + targetDir);

const compareNumbers = (a, b) => {

    const a1 = a.replaceAll("_", 0).replace(/[^0-9]/g, '');
    const b1 = b.replaceAll("_", 0).replace(/[^0-9]/g, '');

    const a2 = ('00000000' + a1).slice(-8);
    const b2 = ('00000000' + b1).slice(-8);

    return parseInt(a2) - parseInt(b2)
};

const compareNumbers2 = (a, b) => {
    const a1 = a.match(/ p(\d+) /);
    const b1 = b.match(/ p(\d+) /);
    
    return parseInt(a1) - parseInt(b1);
};

const run = async () => {

    const data = await fs.readdir(targetDir);

    data.sort(compareNumbers);
    for (let idx = 0; idx < data.length; idx++) {
        const element = data[idx];

        const padNum = ('0000' + (idx+1)).slice(-4);
        const extention = pathModule.extname(element);
        const filename = 'p' + padNum + extention.toLowerCase();

        console.log('rename :' + element + ' => ' + filename);
        //await fs.rename(pathModule.join(targetDir, element), pathModule.join(targetDir, filename));
    }
};

run();