module.exports = async () => {
    const path = require('path');

    const normalize_ext = (() => {
        const convert_map = {'.jpeg' : '.jpg'};

        return (ext) => {
            const result = convert_map[ext.toLowerCase()];
            return result === undefined ? ext.toLowerCase() : result;
        };
    })();
    
    const convert_filename = (name) => {
        const ext = path.extname(name);
        const base = path.basename(name, ext);
        return base + normalize_ext(ext);
    };

    return {name : 'normalize', type : 'filename', handler : convert_filename};
};