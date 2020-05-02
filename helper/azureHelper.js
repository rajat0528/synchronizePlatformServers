const request = require("request");
const baseURL = 'https://management.azure.com';
const apiVersion = '2018-06-01';
const authPrefix = 'Bearer';
 
 class AzureHelper {
    
    static authenticate (param) {        
		
		let options = { 
			method: 'POST',
			url: 'https://login.microsoftonline.com/'+param.TenantID+'/oauth2/token',
			headers: { 
				'cache-control': 'no-cache',
				'content-type': 'multipart/form-data' 
			},
			formData:	{ 
				grant_type		: 	param.GrantType,
				client_id		: 	param.ClientID,
				client_secret	: 	param.ClientSecret,
				resource		: 	param.Resource
			} 
		};
		
		return new Promise((resolve, reject) => {
			
			request(options, function (error, response, data) {				
				if (error){    
					reject(error);      
				}else {  					
					resolve(JSON.parse(data));
				}			
			});
			
		});		

    }
	
	
	static instanceBatch (token, subscriptionId, machineName) {        
		
		let options = { 
			method: 'POST',
			url: baseURL+'/batch',
			qs: { 'api-version': apiVersion },
			headers: { 
				'cache-control': 'no-cache',
				'content-type': 'application/json',
				Authorization: authPrefix+' '+token
			},
			body: { 
				requests: [ 
					{ 
						httpMethod: 'GET',
						  url: "/resources?api-version=2014-04-01-preview&%24filter=(subscriptionId%20eq%20\'"+subscriptionId+"\')%20and%20(substringof(\'"+machineName+"\'%2C%20name))%20and%20(resourceType%20eq%20\'microsoft.compute%2Fvirtualmachines\'%20or%20resourceType%20eq%20\'microsoft.classiccompute%2Fvirtualmachines\')"
					} 
				] 
			},
			json: true 					
		};
		
		return new Promise((resolve, reject) => {
			
			request(options, function (error, response, data) {				
				if (error){   
					reject(error);    
				}else {  		
					resolve(data.responses[0].content.value); 
				}			
			});
			
		});		

    }
	
	static instanceView (token, subscriptionId, resourceGroup, machineName) {        
		
		let options = { 
			method: 'GET',
			url: baseURL+'/subscriptions/'+subscriptionId+'/resourceGroups/'+resourceGroup+'/providers/Microsoft.Compute/virtualMachines/'+machineName+'/instanceView',
			qs: { 'api-version': apiVersion },
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
					resolve(JSON.parse(data));
				}			
			});
			
		});		

	}

	static machineNetworkInterfaces (token, networkUrl) {        
		 
		let options = { 
			method: 'GET',
			url: baseURL+networkUrl,
			qs: { 'api-version': apiVersion },
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
					resolve(JSON.parse(data));
				}			
			});
			
		});		

    }
	
	static virtualMachines (token, subscriptionId) {        
		
		let options = { 
			method: 'GET',
			url: baseURL+'/subscriptions/'+subscriptionId+'/providers/Microsoft.Compute/virtualMachines',
			qs: { 'api-version': apiVersion },
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
					resolve(JSON.parse(data).value);
				}			
			});
			
		});		

    }
	
 }
 
 module.exports = AzureHelper;
 