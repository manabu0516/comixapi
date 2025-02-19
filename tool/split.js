const fs = require('fs').promises;
const { imageSize } = require('image-size');
const sharp = require('sharp'); 
const pathModule = require('path');

const targetDir = process.argv[2];
const outputDir = targetDir + 'split';

console.log('command : split, targetdir=' + targetDir);

const run = async () => {

    await fs.mkdir(outputDir);
    const data = await fs.readdir(targetDir);

    for (let idx = 0; idx < data.length; idx++) {
        const element = data[idx];

        const filepath = pathModule.join(targetDir, element);
        
        const dimensions = await imageSize(filepath);
        const splitWidth = parseInt(dimensions.width / 2);
        const splitHeight = dimensions.height;

        const pathData = pathModule.parse(element);

        const outputFile1 = +pathData.name + '_01' + pathData.ext;
        const outputFile2 = +pathData.name + '_02' + pathData.ext;

        if(idx === 0) {
            const left = parseInt(splitWidth/2);
            await split(left,0,splitWidth,splitHeight, filepath, pathModule.join(outputDir, outputFile1));
        } else {
            await split(splitWidth,0,splitWidth,splitHeight, filepath, pathModule.join(outputDir, outputFile1));
            await split(0,0,splitWidth,splitHeight, filepath, pathModule.join(outputDir, outputFile2));
        }
    }
};

const split = (left,top,width,height, inputFile, outputFile) => {
    return new Promise((resolve, reject) => {
        sharp(inputFile).extract({
            left: left,
            top: top,
            width: width,
            height: height
        }).toFile(outputFile, (err, info) => {
            if(err) {
                reject(err);
            } else {
                resolve(info);
            } 
        });
    });
};

run();