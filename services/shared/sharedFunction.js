const awsHelper = require('./../../helper/awsHelper');
const azureHelper = require('./../../helper/azureHelper');
const gcpHelper = require('./../../helper/gcpHelper');
const createCsvWriter  = require('csv-writer').createObjectCsvWriter;
require('dotenv').config();
const fs = require("fs");
const path = require("path");
const basePath = path.dirname(require.main.filename);
const sesHelper = require('./../../helper/sesMailer');
const dateTimeHelper = require('./../../helper/dateTime');

class SharedFunction {
	
	static async getClusterCredentials(cluster,providerID){ 

        try{
            let [query, cred, gcpCredentials]  = ['', '', ''];
            
            //AWS Credentials
            if(providerID == 1){
                query = await awsHelper.authenticate({
				    RoleARN     	:   cluster.RoleARN,
				    ExternalID  	:   cluster.ExternalID,
                });                
                cred = (query) ? query.Credentials : '';                
            }

            //Azure Credentials
            if(providerID == 2){
                query = await azureHelper.authenticate({
				    TenantID   		:   cluster.TenantID,
                    ClientID     	:   cluster.ClientID,
                    ClientSecret  	:   cluster.ClientSecret,
                    GrantType  		:   cluster.GrantType,
                    Resource  		:   cluster.Resource
                });
                cred = (query) ? query.access_token : '';   
            }

            //Google Cloud Credentials
            if(providerID == 3 && cluster.GcpCredentials != ''){
                gcpCredentials	= JSON.parse(cluster.GcpCredentials);
                query = await gcpHelper.authenticate({
				    ServiceEmail   	:   gcpCredentials.client_email,
					Key     		:   gcpCredentials.private_key
                });
                cred = (query) ? query : '';  
            }
            
            if(cred){
                return {status:true,credential:cred,gcpInfo:gcpCredentials,error:''}
            }else{
                return {status:false,credential:'',gcpInfo:'',error:'Error while fetching credentials'}
            }            

        }catch(error){
            return {status:false,credential:'',gcpInfo:'',error:error.message}
        }
    }
    
    static async getDefaultProject(companyID){
        try{            
            let defaultProject = await mysql.query(await queries.getDefaultProject(companyID),conn);
            if(defaultProject && defaultProject.length){
                return {status:false,projectID:defaultProject[0].ProjectID}
            }
        }catch(error){
            return {status:false,projectID:0}
        }
    }
    
    static async manageCSV(mailData){

        return new Promise(function (resolve, reject) {
			
			let csvData = mailData.data;
            let _dir = (process.env.PRODUCTION_DEPLOYMENT == "true")?(process.env.FUNCTION_DEFAULT_PATH + "/output"):(basePath + "/output");
			if (!fs.existsSync(_dir)) fs.mkdirSync(_dir);
			
			let header = [];
			if(mailData.data && mailData.data.length > 0){			
				let keys = Object.keys(mailData.data[0]);		
				for(var i in keys){	
					header.push({								
						id		:	keys[i],	
						title	: 	keys[i]				
					})
				}
			}
			let csvPath = _dir + "/" + mailData.filename+".csv";
			const csvWriter = createCsvWriter({  
			  path: csvPath,
			  header: header
			});		
			csvWriter.writeRecords(csvData).then(()=>{	

				let mailerData	=	{
					'EmailAddress'	:	mailData.emails,
					'FileName'		:	mailData.filename+".csv",
					'FilePath'		:	csvPath,
                    'Subject'		:	mailData.subject,
                    'ClusterName'	:	mailData.textData.clusterName,
					'RoleARN'       :	mailData.textData.roleARN,
                    'Date'          :	mailData.textData.date,
                    'ErrorMessage'  :	mailData.textData.errorMessage
				}
				sesHelper.serverOnboarded(mailerData, ((mailData.data.length)?true:false) ).then((data)=>{	
					
					fs.unlink(csvPath, function(error) {
					   if (error) reject({status:true,data:'',error:error});
					});
					resolve({status:true,data:mailData.filename+"_"+dateTimeHelper.getDateTime()+".csv file has been Deleted",error:''});
					
				}).
				catch((error)=> {				
					reject({status:true,data:'',error:error});
				})
				
			}).catch((error)=> {
				reject({status:true,data:'',error:error});
			});
			
		});	
    }
	
}
module.exports = SharedFunction;	
