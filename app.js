'use strict';

const env = require('./loadenv').getEnvVar();
const express = require('express') 
const sls = require('serverless-http');
const app = express();
const serverFunction = require('./services/servers/serverFunction');

module.exports.server = (event, context, callback) => {
    (async function () {
		try {	
			//await app.listen(env.PORT);
			let response = await serverFunction.syncActiveClusters( (event.hasOwnProperty('ID'))?event.ID:'' ); 
			callback(response.data);
		} catch(error) { 
			 callback(error);			
		}
	})(); 
};

/*app.get('/', async (req, res, next) => {	
	(async function () {
		try {			
			console.log("==",env);
			//await app.listen(env.PORT);		

			let response = await serverFunction.syncActiveClusters(); 
			console.log("==response====",response);
			 res.status(200).send({status:true,data:response.data,error:''})

		} catch(error) { console.log("====error==",error);
			 res.status(200).send({status:true,data:'',error:error})
		}
	})();
});
module.exports.server = sls(app)*/