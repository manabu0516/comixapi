
const processIofo = {
    current : process.argv[2],
    module  : __dirname,
};

const jszip = require('jszip');
const pathModule = require('path');
const fs = require('fs').promises;

const initialize = async (configure, comixEntries) => {
    const htmlFile = pathModule.join(processIofo.current, configure.webdirectory, 'index.html');
    if(await isExistFile(htmlFile) === false) {
        console.log('no exsist :' + htmlFile);
        console.log('copy index.html');
        await fs.mkdir(pathModule.join(processIofo.current, configure.webdirectory), { recursive: true });
        await fs.copyFile( pathModule.join(processIofo.module, "public", "index.html"), htmlFile);
    } else {
        console.log('exsist :' + htmlFile + ' [ok]');
    }

    const scriptFile1 = pathModule.join(processIofo.current, configure.webdirectory, 'application.js');
    if(await isExistFile(scriptFile1) === false) {
        console.log('no exsist :' + scriptFile1);
        console.log('copy application.js');
        await fs.mkdir(pathModule.join(processIofo.current, configure.webdirectory), { recursive: true });
        fs.copyFile( pathModule.join(processIofo.module, "public", "application.js"), scriptFile1);
    } else {
        console.log('exsist :' + scriptFile1 + ' [ok]');
    }

    const scriptFile2 = pathModule.join(processIofo.current, configure.webdirectory, 'allcomic.js');
    console.log('write allcomic.js');
    await fs.mkdir(pathModule.join(processIofo.current, configure.webdirectory), { recursive: true });
    fs.writeFile(scriptFile2, "loadEntry(" + JSON.stringify(comixEntries) + ');');

    console.log("initialize complete.");
};

const run = async () => {
    try {
        const comixEntries = [];

        const configure = JSON.parse(
            await fs.readFile(pathModule.join(processIofo.current , 'comixapi.json'))
        );

        console.log("process start.");
        for (let i = 0; i < configure.storages.length; i++) {
            const element = configure.storages[i];
            
            await scanStorage(pathModule.join(processIofo.current, element.storage), element.webroot, comixEntries);
        }

        await initialize(configure, comixEntries);

        console.log("process end [success].");
    } catch(e) {
        console.log(' process error :' + e);
        console.log("process end [error].");
    }
};

const scanStorage = async (rootPath, roorWeb, comixEntries) => {
    const collection = await fs.readdir(rootPath);
    const entries = [];

    for (let i = 0; i < collection.length; i++) {
        const element = collection[i];
        const info = await fs.stat(pathModule.join(rootPath, element));

        const thubnail = pathModule.join(rootPath, element, 'thumbnail.jpg');
        if(info.isDirectory() === true && await isExistFile(thubnail)) {
            console.log('  scan start : ' + pathModule.join(rootPath, element));
            await scan_comic(pathModule.join(rootPath, element), roorWeb);
            entries.push(pathModule.join(roorWeb , element));
            console.log('  scan end : ' + pathModule.join(rootPath, element));
        }
    }

    const comicJsonPath = pathModule.join(rootPath, 'comics.json');
    const comicJsonUrl = pathModule.join(roorWeb, 'comics.json');

    console.log("  write comic json data : " + comicJsonPath);
    await fs.writeFile(comicJsonPath, JSON.stringify(entries, null , "\t"));
    console.log("process end [success].");

    comixEntries.push(comicJsonUrl);
};

const scan_comic = async (rootPath, roorWeb) => {
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

run();