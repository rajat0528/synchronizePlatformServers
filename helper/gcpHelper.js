const { GoogleToken } = require('gtoken');
const request = require("request");
const baseURL = 'https://www.googleapis.com';
const authPrefix = 'Bearer';

class GcpHelper {
    
	static authenticate (param) {
        
        let gcpToken = new GoogleToken({
		  email: param.ServiceEmail,
		  scope: ['https://www.googleapis.com/auth/cloud-platform'],
		  key: param.Key
		});

        return new Promise((resolve, reject) => {
			
			gcpToken.getToken(function(error, token) {
			  if (error)
				reject(error);     
			  else
				resolve(token)
			});

        });

    }	
	
	static aggregatedInstances (token, projectId, instanceId, allServers=false) {        
		
		let output = [];
		let options = { 
			method: 'GET',
			url: baseURL+'/compute/v1/projects/'+projectId+'/aggregated/instances',
			qs: (!allServers)?({ filter: 'id = '+instanceId+'' }):'',
			headers: { 
				'cache-control': 'no-cache',
				Authorization: authPrefix+' '+token
			},			
		};

		return new Promise((resolve, reject) => {
			
			request(options, function (error, response, data) {				
				if (error){   
					reject(new ApiError(error.message));    
				}else {  		
					
					if(data){

						let dataResponse	=	JSON.parse(data);
						if(dataResponse.hasOwnProperty('error')){
							
							reject(new ApiError(dataResponse.error.message));    
						}else{

							let instances	=	dataResponse.items;
							let regions		= 	Object.keys(instances);	
							if(regions && regions.length > 0){
								
								for(let i=0; i<regions.length; i++){									
									if (instances[regions[i]].hasOwnProperty('instances')) {
										for(let j=0; j<instances[regions[i]].instances.length; j++){											
											output.push({
												'region'	:	regions[i].split('/')[1],
												'serverId'	:	instances[regions[i]].instances[j].id,
												'serverName':	instances[regions[i]].instances[j].name,
												'networkIp'	:	instances[regions[i]].instances[j].networkInterfaces[0].networkIP,
												'serverStatus': instances[regions[i]].instances[j].status,
												'machineType' : instances[regions[i]].instances[j].machineType
											});
										}
									}						
									
								}
							}

							(!allServers)?(resolve(output[0])):(resolve(output))
						}
					}					
					
				}			
			});
			
		});		

    }	
	
	
	static instanceDetail (token, projectId, zone, instanceId) {        
		
		let options = { 
			method: 'GET',
			url: baseURL+'/compute/v1/projects/'+projectId+'/zones/'+zone+'/instances/'+instanceId+'',
			qs: { filter: 'id = '+instanceId+'' },
			headers: {  
				'cache-control': 'no-cache',
				Authorization: authPrefix+' '+token
			},			
		};

		return new Promise((resolve, reject) => {
			
			request(options, function (error, response, data) {				
				if (error){   
					reject(error);  
				}else {
					resolve(JSON.parse(data))
				}			
			});
			
		});		

    }	
}

module.exports = GcpHelper;


 