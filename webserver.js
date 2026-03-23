const processIofo = {
    configure : process.argv[2],
    module  : __dirname,
};

const fs = require('fs').promises;
const express = require('express');

const run = async () => {
    const configure = JSON.parse(
        await fs.readFile(processIofo.configure)
    );

    const app = express();

    console.log(' bind : ' + configure.web.path + ' =>' + configure.web.webroot);
    app.use(configure.web.webroot, express.static(configure.web.path));
    for (let i = 0; i < configure.storages.length; i++) {
        const confStorage = configure.storages[i];

        console.log(' bind : ' + confStorage.path + ' =>' + confStorage.webroot);
        app.use(confStorage.webroot, express.static(confStorage.path));
    }

    app.listen(3000, () => {
        console.log('listen http://localhost:3000');
    });
};

run();