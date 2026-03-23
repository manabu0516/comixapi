
const processIofo = {
    configure : process.argv[2],
    module  : __dirname,
};

const res = require('express/lib/response');
const jszip = require('jszip');
const pathModule = require('path');
const fs = require('fs').promises;

const run = async () => {
    try {
        const comixEntries = [];

        const configure = JSON.parse(
            await fs.readFile(processIofo.configure)
        );

        console.log("process start.");
        for (let i = 0; i < configure.storages.length; i++) {
            const confStorage = configure.storages[i];
            await scanStorage(confStorage, configure.web, comixEntries);
        }

        await initialize(configure);

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

const scanStorage = async (confStorage, confWeb, comixEntries) => {
    const collection = await fs.readdir(confStorage.path);
    const entries = [];

    for (let i = 0; i < collection.length; i++) {
        const element = collection[i];
        const info = await fs.stat(pathModule.join(confStorage.path, element));

        if(info.isDirectory() === true) {
            console.log('  scan start : ' + pathModule.join(confStorage.path, element));
            const volumes = await scan_comic(element, confStorage, confWeb, {});

            const volumesJsonUrl =pathModule.join(confWeb.webroot, element+'.json');
            const volumesJsonPath =pathModule.join(confWeb.path, element+'.json');

            console.log("    write start volume json data : " + volumesJsonPath);
            await fs.writeFile(volumesJsonPath, JSON.stringify(volumes, null , "\t"));
            console.log("    write end volume json data : " + volumesJsonPath);
            
            entries.push({
                name : element,
                volumes : volumesJsonUrl,
                thumbnail : volumes[0].thumbnail
            });
            console.log('  scan end : ' + pathModule.join(confStorage.path, element));
        }
    }

    const comicJsonPath = pathModule.join(confWeb.path, 'comics.json');
    const comicJsonUrl = pathModule.join(confWeb.webroot, 'comics.json');

    console.log("  write start comic json data : " + comicJsonPath);
    await fs.writeFile(comicJsonPath, JSON.stringify(entries, null , "\t"));
    console.log("  write end comic json data : " + comicJsonPath);

    comixEntries.push(comicJsonUrl);
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

            const volumesJsonPath =pathModule.join(confWeb.path, comicName+'_'+element+'.json');
            console.log("        write start volume json data : " + volumesJsonPath);
            await fs.writeFile(volumesJsonPath, JSON.stringify(processed[element], null , "\t"));
            console.log("        write end volume json data : " + volumesJsonPath);
        }
    }

    /*
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
    */

    const result = [];

    const keys = Object.keys(processed).forEach(e => {
        result.push({
            key : e,
            thumbnail : processed[e].thumbnail,
            meta : pathModule.join(confWeb.webroot, comicName+'_'+e+'.json')
        });
    });

    return result;

};

const initialize = async (configure) => {

    const htmlFile = pathModule.join(configure.web.path, 'index.html');
    const scriptFile = pathModule.join(configure.web.path, 'application.js');

    console.log("generate application file : start");
    console.log("  start index html : " + htmlFile);
    await fs.writeFile(htmlFile, INDEX_HTML, 'utf8');
    console.log("  end index html : " + htmlFile);

    console.log("  start javascript : " + scriptFile);
    await fs.writeFile(scriptFile, APPLICATION_JS, 'utf8');
    console.log("  end javascript : " + scriptFile);
};

const APPLICATION_JS = `


$(async () =>  {

    Handlebars.registerHelper('basename', function(text) {
        return text.split('.').slice(0, -1).join('.');
    });

    Handlebars.registerHelper('stringify', function(json) {
        return new Handlebars.SafeString(JSON.stringify(json));
    });

    Handlebars.registerHelper('first', function(json) {
        return json[0];
    });
    
    Handlebars.registerHelper('bg', function(data) {
        const url = data.thumbnail;
        return "background-image:url("+url+");background-repeat: no-repeat;background-size: contain;background-position: center;background-color: dimgrey;";
    });

    const toJson = (text) => {
        try {
            return JSON.parse(decodeURI(text));
        } catch(e) {
            return {};
        }
    };

    const entries = await (await fetch("./comics.json")).json();
    const routingModules = {};

    routingModules['comics'] = (() => {

        var template = Handlebars.compile($("#comics-template").html());
        $(document).on("click", ".comic-item", (e) => {
            const target = $(e.currentTarget).attr("data-comic");
            location.hash = 'voluems,' + JSON.stringify({target : target});
            return false;
        });

        return async (parameter) => {
            console.log(entries);
            return template({data : entries});
        };
    })();

    routingModules['volume'] = (() => {
        var template = Handlebars.compile($("#volume-template").html());
        return async (parameter) => {
            const target = parameter.target;
            const response = await fetch(parameter.target);
            const json = await response.json();
            const entries = json.entries.map(e => {
                return json.webroot + '/' + e;
            });
            return template({entries : entries});
        };

    })();

    routingModules['voluems'] = (() => {
        var template = Handlebars.compile($("#voluems-template").html());

        $(document).on("click", ".volume-item", (e) => {
            const pages = $(e.currentTarget).attr("data-pages");
            location.hash = 'volume,' + JSON.stringify({target : pages});
            return false;
        });

        return async (parameter) => {
            const target = parameter.target;
            const response = await fetch(parameter.target);
            const json = await response.json();

            console.log(json);
            return template({data : json});
        };
    })();

    const loading = {
        show : () => {
            $('#loading').removeClass('d-none');
        },
        hide : () => {
            $('#loading').addClass('d-none');
        },
    };

    const routing = async (navigation) => {
        loading.show();

        if(navigation === '') {
            navigation = 'comics,{}';
        }

        const splitPoint1 = navigation.indexOf(',');
        const target = splitPoint1 != -1 ? navigation.substring(0, splitPoint1) : navigation;
        const parameter = toJson(splitPoint1 != -1 ? navigation.substring(splitPoint1+1) : "{}");

     
        const module = routingModules[target];
        if(module === undefined) {
            return;
        }

        const html = await module(parameter);
        $("#container").html(html);
        window.scroll({top: 0,behavior: "smooth",});
        setTimeout(() => {loading.hide();}, 1000);
        
    };

    window.onhashchange = () => {
        const route = location.hash.length > 0 ? location.hash.substring(1) : '';
        routing(route.trim());
    };

    routing(location.hash.length > 0 ? location.hash.substring(1).trim() : '');
});
`;

const INDEX_HTML = `

<!DOCTYPE html>
<html lang="ha">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>comixapi viewer</title>
    <link rel="stylesheet" href="https://bootswatch.com/5/flatly/bootstrap.min.css">

    <style>
        #loading {
            background: rgba(0, 0, 0, .5);
            z-index: 10000;
        }
        
        .comic-item {width: 33%}
        .volume-item {width: 33%}
        .page-item {width: 50%;float: right;}
        
        .comic-item .img-thumbnail {height:300px;}
        .volume-item .img-thumbnail {height:300px;}
        
        @media screen and (max-width: 480px) {
            .comic-item {width: 100%}
            .volume-item {width: 100%}
            .page-item {width: 100%}
        }
    </style>

  </head>
  <body>

    <div class="navbar navbar-expand-lg fixed-top bg-primary" data-bs-theme="dark">
        <div class="container">
            <a href="#comics" class="navbar-brand">Comixapi Viewer</a>
        </div>
    </div>
    
    <div id="loading" class="top-0 start-0 w-100 h-100" style="position: fixed;">
        <div class="text-center position-absolute top-50 start-50 w-100 translate-middle">
            <div class="spinner-border text-light" role="status">
                <span class="sr-only"></span>
            </div>
        </div>
    </div>

    <div class="container" style="margin-top: 100px;" id="container">
    </div>

    <script id="comics-template" type="text/x-handlebars-template">
        <div class="row row-cols-1">
            {{#each data}}
            <div data-comic="{{volumes}}" class="col comic-item" style="text-align: center;padding: 10px;cursor: pointer;">
                <div class="img-thumbnail" style="{{bg this}}"></div>
            </div>
            {{/each}}
        </div>
    </script>

    <script id="voluems-template" type="text/x-handlebars-template">
        <div class="row row-cols-1">
            {{#each data}}
            <div data-pages='{{meta}}' class="col volume-item" style="position: relative; padding: 10px;cursor: pointer;">
                <div class="img-thumbnail" style="{{bg this}}"></div>
            </div>
            {{/each}}
        </div>
    </script>

    <script id="volume-template" type="text/x-handlebars-template">
        <div style="text-align: center;">
        {{#each entries}}
        <div style="padding: 5px;text-align: center;" class="page-item">
            <img class="img-thumbnail" loading="lazy" src="{{this}}" style="width: 100%;"></a>
        </div>
        {{/each}}
        </div>
    </script>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.7.8/handlebars.min.js" integrity="sha512-E1dSFxg+wsfJ4HKjutk/WaCzK7S2wv1POn1RRPGh8ZK+ag9l244Vqxji3r6wgz9YBf6+vhQEYJZpSjqWFPg9gg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo=" crossorigin="anonymous"></script>
    <script src="application.js"></script>
  </body>
</html>
`;

run();