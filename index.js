
const processIofo = {
    current : process.argv[2],
    module  : __dirname,
};

const jszip = require('jszip');
const pathModule = require('path');
const fs = require('fs').promises;

const initialize = async () => {
    const htmlFile = pathModule.join(processIofo.current, 'index.html');
    if(await isExistFile(htmlFile) === false) {
        console.log('no exsist :' + htmlFile);
        console.log('copy index.html');
        fs.copyFile( pathModule.join(processIofo.module, "public", "index.html"), htmlFile);
    } else {
        console.log('exsist :' + htmlFile + ' [ok]');
    }

    const scriptFile = pathModule.join(processIofo.current, 'application.js');
    if(await isExistFile(scriptFile) === false) {
        console.log('no exsist :' + scriptFile);
        console.log('copy application.js');
        fs.copyFile( pathModule.join(processIofo.module, "public", "application.js"), scriptFile);
    } else {
        console.log('exsist :' + scriptFile + ' [ok]');
    }

    console.log("initialize complete.");
    run();
};

const run = async () => {
    try {
        const collection = await fs.readdir(processIofo.current);
        const result = [];

        console.log("process start.");
        for (let i = 0; i < collection.length; i++) {
            const element = collection[i];
            const info = await fs.stat(pathModule.join(processIofo.current, element));

            if(info.isDirectory() === true && await isExistFile(pathModule.join(processIofo.current, element, 'thumbnail.jpg'))) {
                console.log('  scan start : ' + pathModule.join(processIofo.current, element));
                await scan_comic(pathModule.join(processIofo.current, element));
                result.push(element);
                console.log('  scan end : ' + pathModule.join(processIofo.current, element));
            }
        }

        const comicJsonPath = pathModule.join(processIofo.current, 'comics.json');

        console.log("  write comic json data : "+comicJsonPath);
        await fs.writeFile(comicJsonPath, JSON.stringify(result, null , "\t"));
        console.log("process end [success].");
    } catch(e) {
        console.log(' process error :' + e);
        console.log("process end [error].");
    }

    const nextsec = 1000 * 60 * 10;
    console.log("------ next " + nextsec + "[msec] after.");
    setTimeout(async () => {
        await run();
    }, nextsec);
};

const scan_comic = async (rootPath) => {
    const collection = await fs.readdir(rootPath);
    const processed = {};

    for (let i = 0; i < collection.length; i++) {
        const element = collection[i];
        const volumePath = pathModule.join(rootPath, element);
        const info = await fs.stat(volumePath);

        if(info.isDirectory() === true) {
            console.log('    scan volume [dir]: ' + element);
            const collection = (await fs.readdir(volumePath)).filter(s => s.endsWith('.jpeg') || s.endsWith('.jpg'));
            processed[element] = collection;
        }
    }

    for (let i = 0; i < collection.length; i++) {
        const element = collection[i];
        const volumePath = pathModule.join(rootPath, element);
        const info = await fs.stat(volumePath);

        if(info.isFile() === true && element.endsWith(".zip")) {
            const basefilename = pathModule.basename(element, '.zip');
            console.log('    scan volume [zip]: ' + element);
            const exist = processed[basefilename] !== undefined;

            const generateTarget = pathModule.join(rootPath, basefilename);
            if(exist) {
                console.log('      exist volume : ' + element);
                console.log('      delete volume and overwrite : ' + element + ' => ' + basefilename);
                await fs.rm(generateTarget, { recursive: true, force: true });
                delete processed[basefilename];
            };

            const zipdata = await fs.readFile(volumePath);
            const zip = jszip();
            await zip.loadAsync(zipdata);

            console.log('      create volume : ' + element);
            await fs.mkdir(generateTarget, { recursive: true });

            const entries = [];
            for (const fileName in zip.files) {
                const file = zip.files[fileName];
                if(file.dir === true) {
                    continue;
                }
                const content = await file.async('nodebuffer');
                await fs.writeFile(pathModule.join(generateTarget, fileName), content);
                entries.push(fileName);
            }
            processed[basefilename] = entries;

            console.log('      delete volume zip : ' + volumePath);
            await fs.rm(volumePath, { recursive: true, force: true });
        }
    }

    const result = [];
    const keys = Object.keys(processed).forEach(e => {
        result.push({
            key : e, pages : processed[e]
        })
    });

    const volumesJsonPath = pathModule.join(rootPath, 'volumes.json');
    console.log("    write volumes json data : " + volumesJsonPath);
    await fs.writeFile(volumesJsonPath, JSON.stringify(result, null , "\t"));
};

const isExistFile = async (path) => {
    try {
        const stat = await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
        return true;
    } catch (e) {
        return false;
    }

}

initialize();