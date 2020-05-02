'use strict';

const express = require('express') 
const app = express();
require('dotenv').config();
const serverFunction = require('./services/servers/serverFunction');

(async function () {
    try {
        await app.listen(process.env.PORT);
        console.log(`Server running on port ${process.env.PORT}`);

        let response = await serverFunction.syncActiveClusters(); 
        if(response.status) console.log(response.data);
        else console.log(response.data);

    } catch(error) { 
        console.log(error)  
    }
})(); 

module.exports = {app};