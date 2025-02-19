

const processIofo = {
    current : process.cwd(),
    module  : __dirname
};

const jszip = require('jszip');
const pathModule = require('path');
const fs = require('fs').promises;
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: true}))

app.listen(3000, console.log('Server listening port 3000'));

const cache = (() => {
    const hashKey = async (key) => {
        return crypto.createHash('md5').update(key).digest('hex')
    };

    const put = async (key, content) => {
        const fullPath = pathModule.join(processIofo.current, '_meta', 'cache', key + '.jpg');
        fs.writeFile(fullPath, content);
        return content;
    };

    const contains = async (key) => {
        try {
            const fullPath = pathModule.join(processIofo.current, '_meta', 'cache', key + '.jpg');
            const stat = fs.stat(fullPath);
            return await stat.isFile();
        } catch(e) {
            return false;
        }
    };

    return {
        hashKey : hashKey,
        put : put,
        contains : contains,
    };
})();

app.get('/comics', async (req, res) => {
    try {
        const result = [];
        
        const files = await fs.readdir(processIofo.current);
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const fullPath = pathModule.join(processIofo.current, f);

            const stat = await fs.stat(fullPath);
            if(stat.isDirectory() === true &&  f.startsWith("_") === false) {
                result.push(f);
            }
        }
        res.json(result);
    } catch(e) {
        res.status(500).send('internal server error');
        console.log(e);
    }
});

app.get('/volumes/:id', async (req, res) => {
    try {
        const result = [];
        const target = pathModule.join(processIofo.current, req.params.id);
        
        const files = await fs.readdir(target);
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const fullPath = pathModule.join(processIofo.current, req.params.id, f);
            const stat = await fs.stat(fullPath);
            if(stat.isFile() === true && f.endsWith(".zip")) {
                result.push({
                    name : req.params.id,vol : f
                });
            }
        }
        res.json(result);
    } catch(e) {
        res.status(500).send('internal server error');
        console.log(e);
    }
});

app.get('/comic/thumbnail/:id', async (req, res) => {
    try {
        const fullPath = pathModule.join(processIofo.current, req.params.id, 'thumbnail.jpg');
        const imageDtata = await fs.readFile(fullPath);
        res.type('jpg');
        res.send(imageDtata);
    } catch(e) {
        res.status(500).send('internal server error');
        console.log(e);
    }
});

app.get('/volume/thumbnail/:id/:vol', async (req, res) => {
    try {
        const fullPath = pathModule.join(processIofo.current, req.params.id, req.params.vol);

        const cacheKey = await cache.hashKey(fullPath + ':thumbnail');
        if(cache.contains(cacheKey) === true) {
            res.redirect('/cache/' + cacheKey);
            return;
        }
        
        const data = await fs.readFile(fullPath);
        const zip = jszip();
        await zip.loadAsync(data);
        for (const fileName in zip.files) {
            const file = zip.files[fileName];
            if(file.dir === true) {
                continue;
            }
    
            const content = await file.async('nodebuffer');
            cacheData = cache.put(cacheKey, content);
            break;
        }

        res.type('jpg');
        res.send(cacheData);
    } catch (e) {
        res.status(500).send('internal server error');
        console.log(e);
    }
});

app.get('/volume/entries/:id/:vol', async (req, res) => {
    
    try {
        const result = [];
        const fullPath = pathModule.join(processIofo.current, req.params.id, req.params.vol);
        
        const data = await fs.readFile(fullPath);
        const zip = jszip();
        await zip.loadAsync(data);
        
        for (const fileName in zip.files) {
            const file = zip.files[fileName];
            if(file.dir === true) {
                continue;
            }
            result.push({
                name : fileName,
                comic : req.params.id,
                volume : req.params.vol
            });
        }

        res.json(result);
    } catch (e) {
        res.status(500).send('internal server error');
        console.log(e);
    }
});

app.get('/page/:id/:vol', async (req, res) => {
    try {
        const fullPath = pathModule.join(processIofo.current, req.params.id, req.params.vol);
        const filename = req.query['p'];

        const cacheKey = await cache.hashKey(fullPath + ':' +filename);
        if(cache.contains(cacheKey) === true) {
            res.redirect('/cache/' + cacheKey);
            return;
        }

        const data = await fs.readFile(fullPath);
        const zip = jszip();
        await zip.loadAsync(data);
        
        const file = zip.files[filename];
        
        const content = await file.async('nodebuffer');
        cacheData = cache.put(cacheKey, content);

        res.type('jpg');
        res.send(cacheData);
    } catch (e) {
        res.status(500).send('internal server error');
        console.log(e);
    }
});

app.use('/static', express.static(pathModule.join(processIofo.module, 'public')));
app.use('/static', express.static(pathModule.join(processIofo.current, '_meta', 'cache')));