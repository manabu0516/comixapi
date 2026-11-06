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

    const timestamp = () => Date.now();

    const entries = await (await fetch("./index.json?_=" + timestamp())).json();
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
            const response = await fetch(parameter.target + '?_='+timestamp());
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
            const response = await fetch(parameter.target+'?_='+timestamp());
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