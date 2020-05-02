require('dotenv').config()

class SqlQueries {	
	
	static async getActiveSyncStatus(){	
		let query = `SELECT cluster.ID, cluster.Name, cluster.RoleARN, cluster.ExternalID, cluster.TenantID, cluster.SubscriptionID, cluster.ClientID, cluster.ClientSecret, cluster.GrantType, cluster.Resource, cluster.GcpCredentials, cluster.ProviderID as ProviderID, provider.Name as ProviderName, company.ID as CompanyID, user.EmailAddress FROM Clusters cluster Inner Join Providers provider On cluster.ProviderID = provider.ID Inner Join Companies company On company.ID = cluster.CompanyID Inner Join Users user On cluster.EmailTo = user.ID WHERE cluster.IsActive='Yes' and cluster.IsDeleted='No' and cluster.SyncStatus='Yes' and company.IsActive='Yes' and company.IsLocked='No'`;
		(process.env.PRODUCTION_DEPLOYMENT == 'false') ? (console.log(query)) : '';
		return query;	
	}	

	static checkClusterServer (clusterID,companyID,instanceID,serverID) {
		let [condition] = [''];
		if(instanceID=='') condition = "ServerID = '"+serverID+"'";
		else condition = "InstanceID = '"+instanceID+"'";
		let query = `SELECT ID, SerialID FROM Servers WHERE ClusterID = '${clusterID}' And CompanyID = '${companyID}' And ${condition}`;
        (process.env.PRODUCTION_DEPLOYMENT == 'false') ? (console.log(query)) : '';
		return query;	 
	}
	
	static getServerNotInCluster (clusterID,companyID,instanceID,serverID) {
		let [condition] = [''];
		if(instanceID=='') condition = "ServerID = '"+serverID+"'";
		else condition = "InstanceID = '"+instanceID+"'";
		let query = `SELECT ID, SerialID FROM Servers WHERE ClusterID != '${clusterID}' And CompanyID = '${companyID}' And ${condition}`;
        (process.env.PRODUCTION_DEPLOYMENT == 'false') ? (console.log(query)) : '';
		return query;	
	}

	static getDefaultProject (companyID) {
		let query = `SELECT IF ( COUNT(ID) = 0 , 0, ID) AS ProjectID FROM Projects WHERE CompanyID = '${companyID}' AND Name = 'Default Project'`;
        (process.env.PRODUCTION_DEPLOYMENT == 'false') ? (console.log(query)) : '';
		return query;
    }

	static async getRegions (providerID) {
		let query = `SELECT ID, Name FROM Regions WHERE IsActive='Yes' and ProviderID=${providerID}`;
		(process.env.PRODUCTION_DEPLOYMENT == 'false') ? (console.log(query)) : '';
		return query;
	}
	
	static async updateServerTerminated (clusterID,companyID,serverID) {
		let query = `UPDATE Servers SET IsTerminated='Yes',IsActive='No' WHERE ID NOT IN(${serverID}) AND ClusterID = '${clusterID}' And CompanyID = '${companyID}' `;
		(process.env.PRODUCTION_DEPLOYMENT == 'false') ? (console.log(query)) : '';
		return query;
    }
		
	static async updateData(cols,filter,tableName){
		let [columns,condition] = ['',''];
		Object.keys(filter).forEach((item) => {
			if(item) condition += item + "='" + filter[item] + "' And ";
		}); 
		Object.keys(cols).forEach((item) => {			
			if(item) columns +=	item + "='" + cols[item] + "' , ";
		});
		condition = condition.replace(/And\s*$/, "");
		columns = columns.replace(/,\s*$/, "");	
		let query = `UPDATE ${tableName} SET ${columns} WHERE ${condition}`;		
		(process.env.PRODUCTION_DEPLOYMENT == 'false') ? (console.log(query)) : '';		
		return query;	
	}	
	
	static async insertData(cols,tableName){		
		let [columns,value] = ['',''];			
		columns = Object.keys(cols).toString();
		value = Object.values(cols).map(x => `'${x}'`).join(',');
		let query = `INSERT INTO ${tableName} (${columns}) VALUES (${value})`;		
		(process.env.PRODUCTION_DEPLOYMENT == 'false') ? (console.log(query)) : '';		
		return query;	
	}
	
	
}
module.exports = SqlQueries
