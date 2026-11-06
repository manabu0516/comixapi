
const processIofo = {
    module  : __dirname,
};

const pathModule = require('path');
const fs = require('fs').promises;
const { Command } = require('commander');

const program = new Command();

program
  .name('comixapi-cli json')
  .description('漫画をWEBで閲覧するための漫画ごとのJSONファイルを生成する')
  .version('1.0.0');

program
  .requiredOption('-c, --config <path>', '設定ファイルのパス')
  .requiredOption('-t, --target <target>', '生成する漫画の名称 ※すべて生成しなおす場合はall)')
  .option('-i, --index', 'インデックスファイルを初期化する')
  .option('-r, --resource', 'リソースファイルを強制上書きする');

program.parse(process.argv);

const options = program.opts();

processIofo.configure = options.config;
processIofo.target = options.target;
processIofo.isRegenerateResource =  !!options.resource; 
processIofo.isRegenerateIndex =  !!options.index; 

const run = async () => {
    console.log('enviroment : '+ JSON.stringify(processIofo));

    if((await isExistFile(processIofo.configure)) == false) {
        console.log('not found coinfigure file :' + processIofo.configure);
        return;
    }
    const configure = JSON.parse(await fs.readFile(processIofo.configure));

    try {
        const indexJsonFile = pathModule.join(configure.web.path, 'index.json');
        const indexData = processIofo.isRegenerateIndex == false && (await isExistFile(indexJsonFile)) === true ? JSON.parse(await fs.readFile(indexJsonFile)) : {};

        const include_targets = processIofo.target === 'all' ? [] : [processIofo.target];

        console.log("process start.");
        for (let i = 0; i < configure.storages.length; i++) {
            const confStorage = configure.storages[i];
            await scanStorage(indexData, confStorage, configure.web, include_targets);
        }

        console.log("  write start comics json data : " + indexJsonFile);
        await fs.writeFile(indexJsonFile, JSON.stringify(indexData, null , "\t"));
        console.log("  write end comics json data : " + indexJsonFile);

        await res_copy(configure);

        console.log("process end [success].");
    } catch(e) {
        console.log(' process error :' + e);
        console.log("process end [error].");
    }
};

const isExistFile = async (path) => {
    try {
        const stat = await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
        return true;
    } catch (e) {
        return false;
    }
};

const isTarget = (name, targets) => {
    if(targets.length === 0) {
        return true;
    }

    for (let i = 0; i < targets.length; i++) {
        const txt = targets[i];
        if(name.indexOf(txt) !== -1) return true;
    }

    return false;
};

const scanStorage = async (indexData, confStorage, confWeb, targets) => {
    const collection = (await fs.readdir(confStorage.path)).filter(e => isTarget(e, targets));

    for (let i = 0; i < collection.length; i++) {
        const element = collection[i];
        const info = await fs.stat(pathModule.join(confStorage.path, element));

        if(info.isDirectory() === true) {
            console.log('  scan start : ' + pathModule.join(confStorage.path, element));

            await fs.rm(pathModule.join(confWeb.path,element), { recursive: true, force: true })
            await fs.mkdir(pathModule.join(confWeb.path,element), { recursive: true });
            const volumes = await scan_comic(element, confStorage, confWeb, {});

            const volumesJsonUrl =pathModule.join(confWeb.webroot, element, 'entries.json');
            const volumesJsonPath =pathModule.join(confWeb.path, element, 'entries.json');

            console.log("    write start volume json data : " + volumesJsonPath);
            await fs.writeFile(volumesJsonPath, JSON.stringify(volumes, null , "\t"));
            console.log("    write end volume json data : " + volumesJsonPath);
            
            indexData[element] = {
                name : element,
                volumes : volumesJsonUrl,
                thumbnail : volumes[volumes.length-1].thumbnail
            };
            console.log('  scan end : ' + pathModule.join(confStorage.path, element));
        }
    }
};

const scan_comic = async (comicName, confStorage, confWeb, options) => {
    const rootPath = pathModule.join(confStorage.path, comicName);

    const collection = await fs.readdir(rootPath);
    const processed = {};

    for (let i = 0; i < collection.length; i++) {
        const element = collection[i];
        const volumePath = pathModule.join(rootPath, element);
        const info = await fs.stat(volumePath);

        if(info.isDirectory() === true) {
            console.log('      scan volume [dir]: ' + element);
            const collection = (await fs.readdir(volumePath)).filter(s => s.endsWith('.jpeg') || s.endsWith('.jpg'));
            processed[element] = {
                entries : collection,
                thumbnail : pathModule.join(confStorage.webroot, comicName, element, collection[0]),
                webroot : pathModule.join(confStorage.webroot, comicName, element)
            };

            const volumesJsonPath =pathModule.join(confWeb.path,comicName, comicName+'_'+element+'.json');
            console.log("        write start volume json data : " + volumesJsonPath);
            await fs.writeFile(volumesJsonPath, JSON.stringify(processed[element], null , "\t"));
            console.log("        write end volume json data : " + volumesJsonPath);
        }
    }

    const result = [];

    const keys = Object.keys(processed).forEach(e => {
        result.push({
            key : e,
            thumbnail : processed[e].thumbnail,
            meta : pathModule.join(confWeb.webroot, comicName, comicName+'_'+e+'.json')
        });
    });

    return result;

};

const res_copy = async (configure) => {
    const o_htmlFile = pathModule.join(configure.web.path, 'index.html');
    const o_appFile = pathModule.join(configure.web.path, 'application.js');
    const o_swFile = pathModule.join(configure.web.path, 'sw.js');
    const o_faviconFile = pathModule.join(configure.web.path, 'favicon.ico');
    const o_manifestFile = pathModule.join(configure.web.path, 'manifest.json');
    const o_iconDir = pathModule.join(configure.web.path, 'icons');

    const i_htmlFile = pathModule.join(processIofo.module, 'web', 'index.html');
    const i_appFile = pathModule.join(processIofo.module, 'web', 'application.js');
    const i_swFile = pathModule.join(processIofo.module, 'web', 'sw.js');
    const i_faviconFile = pathModule.join(processIofo.module, 'web', 'favicon.ico');
    const i_manifestFile = pathModule.join(processIofo.module, 'web', 'manifest.json');
    const i_iconDir = pathModule.join(processIofo.module, 'web', 'icons');

    await fs.copyFile(i_htmlFile, o_htmlFile);
    await fs.copyFile(i_appFile, o_appFile);
    await fs.copyFile(i_swFile, o_swFile);
    await fs.copyFile(i_faviconFile, o_faviconFile);
    await fs.copyFile(i_manifestFile, o_manifestFile);
    await fs.cp(i_iconDir, o_iconDir, { recursive: true });
};

run();