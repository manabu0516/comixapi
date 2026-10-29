


module.exports = async (name) => {
    const pathModule = require('path');
    const fs = require('fs').promises;

    const pluginFolder = pathModule.join(__dirname, name);

    const dirents = await fs.readdir(pluginFolder, { withFileTypes: true });
    const jsFiles = dirents.filter(dirent => {
        if (dirent.isFile()===false) return false;
        const ext = pathModule.extname(dirent.name).toLowerCase();
        return ext === '.js';
      }).map(dirent => {
        return pathModule.join(pluginFolder, dirent.name);
      });

    const result = {};

    for (let i = 0; i < jsFiles.length; i++) {
        const f = jsFiles[i];
        const plugin = await require(f)();
        result[plugin.name] = {
          handler : plugin.handler,
          type : plugin.type
        };
    }
    return result;
};