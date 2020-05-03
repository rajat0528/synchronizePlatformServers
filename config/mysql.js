const mysql  = require('mysql2');
const env = require('./../loadenv').getEnvVar();
 
module.exports = {
    connect: function ()
    {
        return new Promise((resolve, reject) => {
		let pool = mysql.createPool({ 
                host: env.DB_HOST,
                user: env.DB_USER,
                database: env.DB_NAME,
                password: env.DB_PASSWORD,
				port: env.DB_PORT,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });

            pool.getConnection((err, connection) =>
            {
                try
                {
                    if (connection)
                    {
                        resolve({"status":true, "data":"MySQL connected.", "connection":pool});
                        connection.release();
                    }
                }
                catch (err)
                {
                    reject({"status":false, "error":`MySQL error. ${err}`});
                }
                resolve({"status":false, "error":"Error connecting to MySQL."});
            });
        });
    },
	query: async function (sql, connection)
    {
        return new Promise((resolve, reject) => {
			connection.query(sql, (err, results) => {				
				if (err) {reject(err);}else{					
					resolve(results);
				}
				
			});
        });
    }
}