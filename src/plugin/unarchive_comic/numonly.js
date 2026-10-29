module.exports = async () => {
    const path = require('path');
    
    const convert_filename = (name) => {
        const ext = path.extname(name);
        const match = name.match(/\d+/);

        const result = match ? String(Number(match)).padStart(4, '0') + ext : name;
        return result;
    };

    return {name : 'numonly', type : 'filename', handler : convert_filename};
};