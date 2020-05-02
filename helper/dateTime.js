const dateTime = require("node-datetime");
class DateTime {
    static getCurrentDate () {
        const date = dateTime.create();
	    const today = date.format("Y-m-d H:M:S");

        return today;
    }
	
	static getCurrentDateWithoutTime () {
        const date = dateTime.create();
	    const today = date.format("Y-m-d");

        return today;
    } 
	
	static getNextDate (nextDay) {	
		
        var date = new Date();
		var nextRotateDate = new Date(date);
		nextRotateDate.setDate(nextRotateDate.getDate() + nextDay);
  
		var dd = nextRotateDate.getDate();
		var mm = nextRotateDate.getMonth() + 1;
		var y = nextRotateDate.getFullYear();

		if(dd<10)
			dd = "0"+dd;
		if(mm<10)
			mm = "0"+mm;
		
		var formattedDate = y + '-' + mm + '-' + dd; 
		return formattedDate;
	}

	static getPreviousDate (nextDay) {	
		
        var date = new Date();
		var nextRotateDate = new Date(date);
		nextRotateDate.setDate(nextRotateDate.getDate() - nextDay);
  
		var dd = nextRotateDate.getDate();
		var mm = nextRotateDate.getMonth() + 1;
		var y = nextRotateDate.getFullYear();

		if(dd<10)
			dd = "0"+dd;
		if(mm<10)
			mm = "0"+mm;
		
		var formattedDate = y + '-' + mm + '-' + dd; 
		return formattedDate;
	}
	
	static getDateTime () {
        const date = dateTime.create();
	    const today = date.format("YmdHMS");

        return today;
    }
	
	static addHourMinuteDate (hour,minute) {
        var date = new Date();
		if(parseInt(hour)!=0) date.setHours( date.getHours() + parseInt(hour) );
		if(parseInt(minute)!=0) date.setMinutes( date.getMinutes() + parseInt(minute)  );
	    
		var hh = date.getHours();
		var mm = date.getMinutes();		
		
		if(hh<10)
			hh = "0"+hh;
		if(mm<10)
			mm = "0"+mm;

		return hh + ':' + mm;
    }
	
	static getUTCTime(time) {		
		
		var addZero = function (i) {
			if (i < 10) {
			  i = "0" + i;
			}
			return i;
		}
		
		var today = new Date();
		var currentDate = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
		var NewDate = currentDate + " "+ time;    
		var d = new Date(NewDate);
		var currentDate = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();	
		var h = addZero(d.getUTCHours());
		var m = addZero(d.getUTCMinutes());
		var s = addZero(d.getUTCSeconds());   
		return h + ":" + m;  
	}
	
	
}

module.exports = DateTime;
