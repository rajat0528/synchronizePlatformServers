const mysql = require('./../../config/mysql');
const dateTimeHelper = require('./../../helper/dateTime');
const awsHelper = require('./../../helper/awsHelper');
const azureHelper = require('./../../helper/azureHelper');
const gcpHelper = require('./../../helper/gcpHelper');
const queries = require('./../../services/shared/sqlQueries');
const sharedFunction = require('./../../services/shared/SharedFunction'); 
const uuidv1 = require("uuid/v4");

const capitalizeString = (s) => {
	if (typeof s !== 'string') return ''
	return s.charAt(0).toUpperCase() + s.slice(1)
}

class ServerFunction {	

    static async syncActiveClusters(){ 

        try{	

            let [sql, cred, serversList, agentServers]   =   ['', '', '', ''];
			
			let connection = await mysql.connect();
			if(connection.status){
                let conn = connection.connection;
                
                try{                   
                    let clusters = await mysql.query(await queries.getActiveSyncStatus(),conn);
                    if(clusters && clusters.length > 0){

                        for (let cluster of clusters) {

                            //fetch credentials by platform
                            cred = await sharedFunction.getClusterCredentials(cluster,cluster.ProviderID);                         
                            if(cred && cred.status){

                                //AWS servers
                                if(cluster.ProviderID == 1){
                                    serversList = await ServerFunction.serverListAWS(cred.credential,cluster.RoleARN,cluster.ProviderID,cluster.ID,cluster.CompanyID,conn);
                                }
 
                                //Azure servers
                                if(cluster.ProviderID == 2){
                                    agentServers = await ServerFunction.hybridClusterInstances(cluster,conn); 
                                    serversList = await ServerFunction.serverListAzure(cred.credential,cluster,agentServers.servers,conn);
                                }

                                //Google Cloud servers
                                if(cluster.ProviderID == 3)  {                                   
                                    agentServers = await ServerFunction.hybridClusterInstances(cluster,conn);  
                                    serversList = await ServerFunction.serverListGCP(cred.credential,cred.gcpInfo,cluster.ProviderID,cluster.ID,cluster.CompanyID,agentServers.servers,conn);                                     
                                } 

                                let response = await ServerFunction.mailToUser(serversList.servers,cluster);
                                if(response.status) console.log("Email has been sent to user successfully.");
                                else console.log("Error: " + response.error);
                                 
                            }else{                               

                                let response = await ServerFunction.mailToUser([],cluster,("Error while fetching credentials for "+cluster.Name+" cluster. Error: " + cred.error));
                                if(response.status) console.log("Email has been sent to user successfully.");
                                else console.log("Error: " + response.error);
                            }
                            
                            await mysql.query(await queries.updateData({SyncStatus : 'No'},{ID : cluster.ID},'Clusters'),conn);
                        }
                        
                    }else{
                        console.log("No clusters are active for sync");
                    }
                }catch(error){
                    console.log(error);
                }
            }

        }catch(error){
            console.log(error);
        }
    }
 
    static async mailToUser(serversList=[],cluster,errorMessage=''){
        try{
            let mailData	=	{
                subject 		: 	(serversList.length)?("Congrats! Your servers have been onboarded successfully. Cluster Name: " + cluster.Name):("No servers are not onboarded. Cluster Name: " + cluster.Name),
                filename 		: 	"servers_onboarded_"+dateTimeHelper.getDateTime(),
                data			:	serversList,
                emails			:	cluster.EmailAddress,
                textData		:	{
                    clusterName 	:	cluster.Name,
                    roleARN 		:   cluster.RoleARN,
                    date	        :	dateTimeHelper.getCurrentDate(),
                    errorMessage    :   errorMessage
                }
            };	
            let response = await sharedFunction.manageCSV(mailData);
            if(response.status) return {status:true,error:''}
            else return {status:false,error:'Error while sending an email'}

        }catch(error){
            return {status:false,error:error.message}
        }
    }

    static async hybridClusterInstances(cluster,conn){

        try{

            function dateFormat(date) {
                var d       = new Date(date);
                var date    = d.getDate();
                var month   = d.getMonth() + 1;
                var year    = d.getFullYear();                
                var hours = d.getHours();
                var mins = d.getMinutes();                
                var datestring = year + "-" + month + "-" + date + " " + hours + ":" + mins;                
                return datestring;
            }

            let [cred,regions,servers,serversList]   =   ['','','',[]];
            cred = await sharedFunction.getClusterCredentials(cluster,1);
            if(cred && cred.status){
                regions = await mysql.query(await queries.getRegions(1),conn);
                if(regions && regions.length > 0){
                    for (let region of regions) { 
                        servers = await awsHelper.describeInstanceInformation(cred.credential,region.Name,'',cluster.RoleARN);                      
                        //servers = await awsHelper.hybridClusterInstances(cred.credential,cluster.RoleARN,region.Name);  
                        if(servers && servers.InstanceInformationList.length){                                
                            for (let entries of servers.InstanceInformationList) {     
                                entries.RegionID    = region.ID;
                                entries.RegionName  = region.Name;   
                                entries.modifiedRegistrationDate = dateFormat(entries.RegistrationDate);          
                                serversList.push(entries);                              
                            }
                        }                  
                    }                        
                    serversList = serversList.filter(function(el) {  return el.hasOwnProperty('ComputerName') && el.ComputerName != '';  })
                    return {status:true,servers:serversList,error:''}
                }
            }else{
                return {status:false,servers:'',error:"Error while fetching credentials for"+cluster.Name+" cluster. Error: " + cred.error}
            } 
                  
        }catch(error){
            return {status:false,servers:'',error:error.message}
        }

    }
    
    static async serverListAWS(cred,roleARN,providerID,clusterID,companyID,conn){

        try{
            let [regions,serversList,serverStatus]   =   ['',[],''];
            regions = await mysql.query(await queries.getRegions(providerID),conn);
            if(regions && regions.length > 0){
                for (let region of regions) {
                    let servers = await awsHelper.clusterInstances(cred,roleARN,region.Name);
                    if(servers && servers.Reservations){
                        for (let reservation of servers.Reservations) {
                            if(reservation && reservation.Instances.length){
                                for (let instance of reservation.Instances) {

                                    //Check server tags
                                    let [serverTags,serverName] = ['',''];
                                    if(instance.Tags && instance.Tags.length > 0){	
                                        serverTags	=	instance.Tags;			
                                        let obj = instance.Tags.find(o => o.Key.toLowerCase() === 'name');
                                        serverName  = (obj) ? (obj.Value) : (instance.InstanceId);                                       			
                                    }else{				
                                        serverName	=	instance.InstanceId;		
                                    }

                                    let ssmStatus = await awsHelper.describeInstanceInformation(cred,region.Name,instance.InstanceId,'');        

                                    let server = {
                                        Name  			:   serverName,
                                        InstanceID		:	instance.InstanceId,
                                        ServerID		:	instance.InstanceId,
                                        InstanceType	:	(instance.InstanceType) ? (instance.InstanceType) : '',
                                        ServerType		:	'Non Hybrid',
                                        ServerTags		:	JSON.stringify(serverTags),
                                        PublicDNS		:	(instance.PublicDnsName) ? (instance.PublicDnsName) : '',
                                        PublicIP		:	(instance.PublicIpAddress) ? (instance.PublicIpAddress) : '',
                                        PrivateIP		:	(instance.PrivateIpAddress) ? (instance.PrivateIpAddress) : '',
                                        PrivateDNS		:	(instance.PrivateDnsName) ? (instance.PrivateDnsName) : '',
                                        RegionID		:	region.ID,
                                        OtherRegionName :   '',
                                        VPC				:	(instance.VpcId) ? (instance.VpcId) : '',
                                        Platform		:	(instance.Platform && instance.Platform == 'windows') ? (capitalizeString(instance.Platform)) : '',
                                        OsVersion		:	'',
                                        SSMStatus       :   (ssmStatus.InstanceInformationList.length && ssmStatus.InstanceInformationList[0].PingStatus  == "Online")?'Yes':'No',
                                        ClusterID		:	clusterID,
                                        ProviderID		: 	providerID,
                                        ProjectID		:	0,			
                                        CompanyID		:	companyID,
                                        IsServerRunning	:	(instance.State && instance.State.Name == 'running') ? 'Yes' : 'No',
                                        IsActive        :   (ssmStatus.InstanceInformationList.length)?'Yes':'No',
                                        CreatedDate		:	dateTimeHelper.getCurrentDate()			
                                    };

                                    let response = await ServerFunction.manageServerData(server,clusterID,companyID,instance.InstanceId,region.Name,conn);
                                    if(response.status) serversList.push(response.servers[0]);  
                                    
                                } 
                            }
                        }
                    }                    
                }

                //Update servers(Terminated = Yes)
                let response = await ServerFunction.manageTerminatedServers(serversList,clusterID,companyID,conn);
                if(response.status) return {status:true,servers:response.servers,error:''}
            }
        }catch(error){ 
            return {status:false,servers:'',error:error.message}
        }
        
    }


    static async serverListAzure(cred,cluster,agentServers,conn){

        try{
            let [instances,serversList,ssmServers,response]   =   ['',[],[],''];
            instances = await azureHelper.virtualMachines(cred,cluster.SubscriptionID);  
            if(instances && instances.length){               
                for (let instance of instances) {    
                    let resourceGroup = (instance.id.split('/')[4]);                      
                    let instanceView = await azureHelper.instanceView(cred,cluster.SubscriptionID,resourceGroup,instance.name);                    
                    let networkProfile = await azureHelper.machineNetworkInterfaces(cred,instance.properties.networkProfile.networkInterfaces[0].id);
                    response = await ServerFunction.checkServersFromSSM(agentServers,instance.properties.osProfile.computerName,instance.name,'',networkProfile.properties.ipConfigurations[0].properties.privateIPAddress,cluster.ProviderID);
                    
                    (response.status)?(ssmServers = response.server):(ssmServers = []); 

                    let server = {
                        Name  			:   instance.name,
                        InstanceID		:	(ssmServers.length)?ssmServers[0].InstanceId:'',
                        ServerID		:	instance.properties.vmId,
                        InstanceType	:	instance.type,
                        ServerType		:	'Hybrid',
                        ServerTags		:	'',
                        PublicDNS		:	'',
                        PublicIP		:	'',
                        PrivateIP		:	networkProfile.properties.ipConfigurations[0].properties.privateIPAddress,
                        PrivateDNS		:	'',
                        RegionID		:	(ssmServers.length)?ssmServers[0].RegionID:'',
                        OtherRegionName :   instance.location,
                        VPC				:	'',
                        Platform		:	(instance.properties.storageProfile.osDisk.osProfile == 'Linux')?'Linux':'Windows',
                        OsVersion		:	'',
                        SSMStatus       :   (ssmServers.length && ssmServers[0].PingStatus == 'Online')?'Yes':'No',
                        ResourceGroup   :   resourceGroup,
                        ClusterID		:	cluster.ID,
                        ProviderID		: 	cluster.ProviderID,
                        ProjectID		:	0,			
                        CompanyID		:	cluster.CompanyID,
                        IsServerRunning	:	(instanceView.statuses[1].displayStatus == 'VM running')?'Yes':'No',
                        IsActive        :   (ssmServers.length)?'Yes':'No',
                        CreatedDate		:	dateTimeHelper.getCurrentDate()			
                    };     
             
                    response = await ServerFunction.manageServerData(server,cluster.ID,cluster.CompanyID,((ssmServers.length)?ssmServers[0].InstanceId:''),instance.properties.vmId,instance.location,conn);
                    if(response.status) serversList.push(response.servers[0]);                    
                }

                //Update servers(Terminated = Yes)
                response = await ServerFunction.manageTerminatedServers(serversList,cluster.ID,cluster.CompanyID,conn);
                if(response.status) return {status:true,servers:response.servers,error:''}
            }

        }catch(error){
            return {status:false,servers:'',error:error.message}
        }
    }


    static async serverListGCP(cred,gcpInfo,providerID,clusterID,companyID,agentServers,conn){

        try{
            let [instances,serversList,ssmServers,response]   =   ['',[],[],''];
            instances = await gcpHelper.aggregatedInstances(cred, gcpInfo.project_id,'',true);
            if(instances && instances.length){
                for (let instance of instances) {
                    
                    let projectID = (instance.machineType.split('/')[6]).split('-')[1];                   
                    response = await ServerFunction.checkServersFromSSM(agentServers,instance.serverName,instance.serverName,projectID,instance.networkIp,providerID);
                    (response.status)?(ssmServers = response.server):(ssmServers = []); 

                    let server = {
                        Name  			:   instance.serverName,
                        InstanceID		:	(ssmServers.length)?ssmServers[0].InstanceId:'',
                        ServerID		:	instance.serverId,
                        InstanceType	:	'',
                        ServerType		:	'Hybrid',
                        ServerTags		:	'',
                        PublicDNS		:	'',
                        PublicIP		:	'',
                        PrivateIP		:	(instance.networkIp) ? (instance.networkIp) : '',
                        PrivateDNS		:	'',
                        RegionID		:	(ssmServers.length)?ssmServers[0].RegionID:'',
                        OtherRegionName :   instance.region,
                        VPC				:	'',
                        Platform		:	(ssmServers.length) ? capitalizeString(ssmServers[0].PlatformType) : '' ,
                        OsVersion		:	'',
                        SSMStatus       :   (ssmServers.length && ssmServers[0].PingStatus == 'Online')?'Yes':'No',
                        ClusterID		:	clusterID,
                        ProviderID		: 	providerID,
                        ProjectID		:	0,			
                        CompanyID		:	companyID,
                        IsServerRunning	:	(instance.serverStatus == 'TERMINATED')?'No':'Yes',
                        IsActive        :   (ssmServers.length)?'Yes':'No',
                        CreatedDate		:	dateTimeHelper.getCurrentDate()			
                    };

                    response = await ServerFunction.manageServerData(server,clusterID,companyID,((ssmServers.length)?ssmServers[0].InstanceId:''),instance.serverId,instance.region,conn);
                    if(response.status) serversList.push(response.servers[0]);                  
                    
                }

                //Update servers(Terminated = Yes)
                response = await ServerFunction.manageTerminatedServers(serversList,clusterID,companyID,conn);
                if(response.status) return {status:true,servers:response.servers,error:''}
            }

        }catch(error){
            return {status:false,servers:'',error:error.message}
        }
    }

    static async manageServerData(server,clusterID,companyID,instanceId,serverId,regionName,conn){

        let [serverStatus,serversList]   =   ['',[]];
        
        //Check server exists or not
        serverStatus = await mysql.query(await queries.checkClusterServer(clusterID,companyID,instanceId,serverId),conn);
        if(serverStatus && serverStatus.length){
            //Update the record
            delete server.ProjectID;
            delete server.ProviderID;	
            delete server.IsActive;
            server.IsTerminated  = 	'No';
            await mysql.query(await queries.updateData(server,
            {
                ID : serverStatus[0].ID
            }
            ,'Servers'),conn);

            server.ServerID  = serverStatus[0].ID;
            server.RegionName  = regionName;
            server.Status  = 'Updated';
            server.Message = 'The server already exists'
            serversList.push(server);

        }else{

            //Check if the instance exists in another cluster of the same company	
            serverStatus = await mysql.query(await queries.getServerNotInCluster(clusterID,companyID,instanceId,serverId),conn);
            if(serverStatus && serverStatus.length){
                delete server.ProjectID;
                delete server.ProviderID;
                delete server.IsActive;
                server.IsTerminated  = 	'No';

                await mysql.query(await queries.updateData(server,
                {
                    ID : serverStatus[0].ID
                }
                ,'Servers'),conn);

                server.ServerID  = serverStatus[0].ID;
                server.RegionName  = regionName;
                server.Status  = 'Updated';
                server.Message = 'ARN has changed of this server.'
                serversList.push(server);

            }else{
                //Insert the record
                server.SerialID    =   uuidv1();
                server.ProjectID   = 	(await sharedFunction.getDefaultProject(companyID)).projectID;
                server.IsTerminated= 	'No';
                let query = await mysql.query(await queries.insertData(server,'Servers'),conn);

                server.ServerID  = query.insertId;
                server.RegionName  = regionName;
                server.Status  = 'New Server';
                server.Message = ''
                serversList.push(server);
            }                                        
        }

        return {status:true,servers:serversList,error:''}
    }

    static async manageTerminatedServers(serversList,clusterID,companyID,conn){
        if(serversList.length){
            let serverIDs = serversList.map(({ ServerID }) => ServerID);
            if(serverIDs){
                await mysql.query(await queries.updateServerTerminated(clusterID,companyID,serverIDs.toString()),conn);
            }

            serversList.forEach(function(el) { 
                delete el.ServerID;
                delete el.ServerType;
                delete el.ServerTags;
                delete el.PublicDNS;
                delete el.PublicIP;
                delete el.PrivateIP;
                delete el.PrivateDNS;
                delete el.RegionID;
                delete el.VPC;
                delete el.OsVersion;
                delete el.ClusterID;
                delete el.ProviderID;
                delete el.ProjectID;
                delete el.CompanyID;
                delete el.CreatedDate;
                delete el.IsTerminated;
                delete el.OtherRegionName;
            }); 
        }

        return {status:true,servers:serversList,error:''}
    }

    static async checkServersFromSSM(agentServers,serverName,computerName,projectID,ipAddress,providerID){
        let [server] = [[]];
        if(providerID == 2){
            server = agentServers.filter(el=> { return ( (el.ComputerName.toLowerCase().includes(serverName) == true || el.ComputerName.toLowerCase().includes(computerName) == true ) && (el.IPAddress == ipAddress) && (el.AssociationStatus == 'Success') ) });
        }
        if(providerID == 3){
            server = agentServers.filter(el=> { return ( (el.ComputerName.toLowerCase().includes(serverName) == true || el.ComputerName.toLowerCase().includes(computerName) == true || el.ComputerName.toLowerCase().includes(projectID) == true) && (el.IPAddress == ipAddress) && (el.AssociationStatus == 'Success') ) });
        }   
        //check duplicate 
        if(server.length > 1){
            let response = [];
            response = server.filter(function(el) {  return el.PingStatus == 'Online';  });
            if(response.length == 0 || response.length > 1){
                //if we are again getting duplicate results compare dates. pick latest installed                
                response = server.sort(function(a, b) { return new Date(b.modifiedRegistrationDate) - new Date(a.modifiedRegistrationDate); });
                server  = response.splice(0);
            }else{
                server = response;
            }
            
        }      
        if(server.length) return {status:true,server:server};
        else return {status:false,server:''};            							
    }    
}

module.exports = ServerFunction;	