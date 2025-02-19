
const admZip = require('adm-zip');

const targetDir = process.argv[2];
const pathModule = require('path');

const dir = pathModule.dirname(targetDir);
const base = pathModule.basename(targetDir);

const outputFile = pathModule.join(dir, base + '.zip');

console.log('command : archive, targetdir=' + targetDir + ', output=' + outputFile);

const zip = new admZip();
zip.addLocalFolder(targetDir);
zip.writeZip(outputFile);