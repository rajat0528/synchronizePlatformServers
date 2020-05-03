const Email = require("email-templates");
const fs = require("fs");
const dateTime = require('./dateTime');
require('dotenv').config()
const env = require('./../loadenv').getEnvVar();
const AWS = require("aws-sdk");
const SES = new AWS.SES({apiVersion: '2010-12-01', region : 'us-west-2' });
const path = require("path");
const basePath = path.dirname(require.main.filename);

let mailBody = (mail) => new Promise((resolve, reject) => {
	
	//check if email is sending to multiple 
	let emailAddresses = mail.to.split(',');        
	
	let mailer = "From: 'InfraGuard Software Services' <" + `${env.COMPANY_MAIL}` + ">\n";

	for(let i = 0, len = emailAddresses.length; i < len; i++) 
		mailer += "To: " + emailAddresses[i] + "\n";
   
	//mailer += "Bcc: " + `${env.COMPANY_MAIL}` + "\n";        
	//emailAddresses.push(`${env.COMPANY_MAIL}`);

	mailer += "Subject: " + mail.subject + "\n";
	mailer += "MIME-Version: 1.0\n";
	mailer += "Content-Type: multipart/mixed; boundary=\"NextPart\"\n\n";
	mailer += "--NextPart\n";
	mailer += "Content-Type: text/html\n\n";
	mailer += " "+mail.body+" \n\n";
	mailer += "--NextPart\n";

	if(mail.isAttachment){
		mailer += "Content-Type: text/plain; name=\""+mail.fileName+"\"\n";            
		mailer += "Content-Disposition: attachment\n\n";    
		mailer += mail.filePath + "\n\n";   
	}

	if(mail.isCSVAttachment){
		mailer += "Content-Type: text/csv; name=\""+mail.fileName+"\"\n";
		mailer += "Content-Disposition: attachment\n\n";  
		mailer += mail.filePath + "\n\n";
	}

	if(mail.isZipAttachment){
		let buff = Buffer.from(mail.filePath);
		mailer += "Content-Type: application/zip; name=\""+mail.fileName+"\"\n";
		mailer += "Content-Transfer-Encoding: base64\n";	
		mailer += "Content-Disposition: attachment\n\n";  
		mailer += buff.toString('base64') + "\n\n";
	}            
	
	mailer += "--NextPart--";  
	
	let params = {
		Destinations: emailAddresses,            
		RawMessage: {
			Data: mailer
		},
		Source: `${env.COMPANY_MAIL}`
	};	
	
	resolve(params)
});

class SesHelper {	

    static getPath (email) {
        const rootPath = email.config.views.root;
        const arr = rootPath.split("/");
        arr.pop();  
        return arr.join("/");
    }

    static async serverOnboarded(mailerData, attachment=false){		

		return new Promise(function (resolve, reject) {
			
			let userEmail 	=	mailerData.EmailAddress;  
			const templateDir = process.env.LAMBDA_TASK_ROOT +"/email_templates/onboard_servers/serverslist";
            const email = new Email();
            email.config.views.root = SesHelper.getPath(email);
            email.config.views.options.extension = "ejs";
			email.render(templateDir, {userEmail,
				clusterName: `${mailerData.ClusterName}`, 
				roleARN: `${mailerData.RoleARN}`, 
				errorMessage: `${mailerData.ErrorMessage}`, 
                date: `${mailerData.Date}`, 
                url: `${env.BASE_URL}`,
				s3url: `${env.S3BUCKET}`,		
                year: `${dateTime.getCurrentDateWithoutTime().split("-")[0]}`
			}).then((emailData)=> {
				
				fs.readFile(mailerData.FilePath, "utf8", function(error, fileData) {
					if(error) reject(error);
					
					let mailer  =   {
						to          	:   mailerData.EmailAddress,        
						subject     	:   mailerData.Subject,
						body        	:   emailData,
						isCSVAttachment	:   attachment,
						fileName    	:   mailerData.FileName, 
						filePath    	:   fileData, 
					}	
										
					mailBody(mailer).then((emailData)=> {						
						
						SES.sendRawEmail(emailData, function(error, data) {
							if (error) reject({status:false,data:'',error:error});
							resolve(data);
						}); 
					}).catch((error)=> {
						reject(error);
					});			
					
				})
				
			}).catch((error)=> {
				reject(error);
			});
			
		});		
	
    }
    
}
module.exports = SesHelper;