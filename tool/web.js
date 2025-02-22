
const processIofo = {
    current : process.argv[2],
    module  : __dirname,
};

const express = require("express");
const app = express();

app.use(express.static(processIofo.current));

app.listen(3000, () => {
    console.log("Node.js is listening to PORT: 3000");
});