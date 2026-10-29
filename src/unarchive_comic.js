
const processIofo = {
    module  : __dirname,
};

const pathModule = require('path');
const os = require('os');
const fs = require('fs').promises;
const { Command } = require('commander');
const AdmZip = require('adm-zip');
const { unrar } = require('unrar-promise'); 
const plugin = require('./plugin/plugin.js')

const program = new Command();

program
  .name('comixapi-cli unarchive')
  .description('ZIPファイル(漫画)を所定のフォルダに解凍する')
  .version('1.0.0');

program
  .requiredOption('-i, --input <path>', 'ZIP or RARファイルのパス')
  .option('-o, --output <path>', '公開先のフォルダ')
  .option('-d, --delete', 'アーカイブファイルの削除')
  .option('-p, --plugin <name>', '使用するプラグインモジュール');

program.parse(process.argv);
const options = program.opts();

processIofo.inputFilePath = options.input;
processIofo.outputDirPath = options.output;
processIofo.archiveDelete = !!options.delete;
processIofo.plugins = options.plugin === undefined ? [] :  options.plugin.split(',');

const run = async () => {
    const plugins = await plugin('unarchive_comic');

    processIofo.tmpDirPath = await fs.mkdtemp(pathModule.join(os.tmpdir(), 'comix-api-'));

    if(processIofo.outputDirPath === undefined) {
        const parentDir = pathModule.dirname(processIofo.inputFilePath);
        const ext = pathModule.extname(processIofo.inputFilePath);
        const fileName = pathModule.basename(processIofo.inputFilePath, ext);
        processIofo.outputDirPath = pathModule.join(parentDir, fileName);
    }

    try {
        console.log('enviroment : '+ JSON.stringify(processIofo));

        if((await isExistFile(processIofo.inputFilePath)) == false) {
            console.log('not found archive file :' + processIofo.inputFilePath);
            return;
        }

        const archiveFile = await loadArchive(processIofo);
        await archiveFile.initialize();

        const filename_handler = processIofo.plugins
            .map(e => plugins[e])
            .filter(e => e !== undefined)
            .filter(e => e.type === 'filename')
            .map(e => e.handler);

        const filedata_handler = processIofo.plugins
            .map(e => plugins[e])
            .filter(e => e !== undefined)
            .filter(e => e.type === 'filedata')
            .map(e => e.handler);
    

        const entries = archiveFile.entries();
        const futures = [];
        for (let idx = 0; idx < entries.length; idx++) {
            const element = entries[idx];

            const filename = replaceFileName(element.filename, filename_handler);
            const f = archiveFile.copy(processIofo.outputDirPath, filename, element);
            futures.push(f);
        }

        const files = await Promise.all(futures);
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            await handleFileData(f, filedata_handler);
        }

        await archiveFile.destroy({archiveDelete : processIofo.archiveDelete});
    } catch(e) {
        console.log(e);
    }
    await fs.rm(processIofo.tmpDirPath, { recursive: true, force: true });
};

const handleFileData = async (entries, handlers) => {
    let result = entries;
    const event = {
        stoppropagation : false
    };

    for (let i = 0; i < handlers.length; i++) {
        if(event.stoppropagation === true) {
            break;
        }
        const h = handlers[i];
        result = await h(result, event);
    }
    return result;
};

const replaceFileName = (base, handlers) => {
    let result = base;
    for (let i = 0; i < handlers.length; i++) {
        const h = handlers[i];
        result = h(result);
    }
    return result;
};

const loadArchive = async (processIofo) => {
    await unrar(processIofo.inputFilePath, processIofo.tmpDirPath);
    const files = await loadFiles(processIofo.tmpDirPath);

    const accsessor = {};

    accsessor.initialize = async(opt) => {
        await fs.rm(processIofo.outputDirPath, { recursive: true, force: true });
    };
    accsessor.destroy = async (opt) => {
        if(opt.archiveDelete === true) await fs.unlink(processIofo.inputFilePath);
    };
    accsessor.entries = () => files.map(e => {
        return {filename:pathModule.basename(e), fullpath:e };
    });
    accsessor.copy = async (dir, filename, e) => {
        await fs.cp(e.fullpath, pathModule.join(dir, filename));
        return [pathModule.join(dir, filename)];
    };
    return accsessor;
};

const loadFiles = async (dir) => {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = pathModule.resolve(dir, dirent.name);
    return dirent.isDirectory() ? loadFiles(res) : res;
  }));
  
  return files.flat();
}

const isExistFile = async (path) => {
    try {
        const stat = await fs.access(path, fs.constants.R_OK | fs.constants.W_OK);
        return true;
    } catch (e) {
        return false;
    }
};

run();
