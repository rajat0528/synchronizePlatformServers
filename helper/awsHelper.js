const AWS = require("aws-sdk");
const fs = require("fs");

class AwsHelper {
    
    static authenticate (param) {
        
        const config        = new AWS.Config();
        const sts           = new AWS.STS({apiVersion: '2011-06-15'});
        const sessionName   = "InfraGuardApp"

        var request = {

            DurationSeconds :    3600,
            ExternalId      :    param.ExternalID,
            RoleArn         :    param.RoleARN,
            RoleSessionName :    sessionName
        };

        return new Promise((resolve, reject) => {

            sts.assumeRole(request, function (error, resposne) {
              if (error)             
                reject(error);            
              else 
                resolve(resposne)
            })

        });
    }	
	
	static ec2SetRegion(credentials, region){        

        const creds = new AWS.Credentials({

            accessKeyId     : credentials.AccessKeyId, 
            secretAccessKey : credentials.SecretAccessKey,
            sessionToken    : credentials.SessionToken

        });        

        const ec2 = new AWS.EC2({
            apiVersion  :   '2016-11-15',
            region      :   region,
            credentials :   creds
        });        

        return ec2;
    }	

    static ssmSetRegion(credentials, region){        

        const creds = new AWS.Credentials({

            accessKeyId     : credentials.AccessKeyId, 
            secretAccessKey : credentials.SecretAccessKey,
            sessionToken    : credentials.SessionToken

        });        

        const ssm = new AWS.SSM({
            apiVersion  :   '2014-11-06',
            region      :   region,
            credentials :   creds
        });        

        return ssm;
    }

    static clusterInstances(credentials, RoleARN, region){
		
      const ec2   = AwsHelper.ec2SetRegion(credentials, region);
      const targetARN = RoleARN.replace('role', "instance-profile")
      
      const params = {
          Filters: [	
            {
                Name: "iam-instance-profile.arn", 
                Values: [
                    targetARN
                ]
            }          
          ],
          MaxResults : 1000
      };
      
      return new Promise((resolve, reject) => {
        
        ec2.describeInstances(params, function (error, resposne) {
                if (error)             
                  reject(error);    
                else 
                  resolve(resposne)
              })
      });
		
    }
    
    static hybridClusterInstances(credentials, RoleARN, region){
        
      const ssm   = AwsHelper.ssmSetRegion(credentials, region);
      const targetARN = (RoleARN.replace('role', "instance-profile")).split("/")[1];
      const params = {
        Filters: [
          {
              Key: "AWS:InstanceInformation.IamRole", 
              Values: [
                targetARN
              ],
              Type : 'Equal'
          }        
        ],
              
      };
      return new Promise((resolve, reject) => {
        
        ssm.getInventory(params, function (error, resposne) {
            if (error) reject(error);    
            else resolve(resposne)
        });

      });
		
    }

    static describeInstanceInformation(credentials, region, instanceId, RoleARN=''){

      const ssm       = AwsHelper.ssmSetRegion(credentials, region);		
      const params = {     
    
        InstanceInformationFilterList: [	
            {
                key: (RoleARN)?"IamRole":"InstanceIds", 
                valueSet: [
                    (RoleARN)?((RoleARN.replace('role', "instance-profile")).split("/")[1]):instanceId
                ]
            }
           
          ],
      };
       
      return new Promise((resolve, reject) => {
      
        ssm.describeInstanceInformation( params , function (error, data) {
            if (error) reject(error);    
            else resolve(data);        
        });
      
      });

  }
    
}

module.exports = AwsHelper;