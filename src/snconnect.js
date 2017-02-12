'use strict';

var request = require('request');
var querystring = require('querystring');

/**
 * @typedef ClientConfig
 * @type {object}
 * @property {string} instance - base URL to instance i.e. "https://demo.servicenow.com"
 * @property {string} username - login of the user to act on behalf of
 * @property {string} password
 */

/**
 * Builds a connection to a specific instance
 * @class
 *
 * @example
 * var servicenow = require('servicenow');
 * var config = {
 *     instance: "https://demo.servicenow.com",
 *     username: "admin",
 *     password: "admin"
 * };
 * var client = new servicenow.Client(config);
 *
 * @constructor
 * @param {ClientConfig} config - config object
 *
 */
function Client(config) {
    this.instance = config.instance;
    this.profile_id = null;
    this.config = config;

    this.request = request.defaults({
        auth: {
            user: config.username,
            pass: config.password,
            sendImmediately: true
        },
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Charset": "utf-8"
        }
    });

    this.base_url = this.instance + '/api/';
    this.table_url = this.base_url + 'now/table/';
    this.snconnect_api = this.base_url + "x_snc_connect_app/snconnect/";

}

Client.prototype.get = function(api_call,params,callback) {
    var url = this.snconnect_api + api_call;
    if(params && typeof(params) == "object") {
           params = querystring.stringify(params);
           url = url + '?' + params;
    }
    console.log("Url:: " + url);

  

    this.request.get(url, function(err,response,body) {
        resultHandler(err,response,body,callback);
    });
};

Client.prototype.post = function(api_call,params,data,callback) {
    var url = this.snconnect_api + api_call;
    if(params && typeof(params) == "object") {
           params = querystring.stringify(params);
           url = url + '?' + params;
    } 
    
    data = JSON.stringify(data);
   var opts = {
        body:  data.toString()
    };
    
   

    this.request.post(url, opts, function(err,response,body) {
        resultHandler(err,response,body,callback);
    });
};


Client.prototype.getProfile = function(callback) {
    var that = this; // trick to have this inside the scope;
    this.get("profile",null,function(error,resp){
        if(!error) {
            that.profile_id=resp.profile_id;
        }
        callback(error,resp);
    });
};
Client.prototype.getGroups = function(callback) {
    var that = this; // trick to have this inside the scope;
    this.get("groups",{"member_id":this.profile_id},function(error,resp){
        if(!error) {

            that.groups=resp;
        }
        callback(error,resp);
    });
};

Client.prototype.getMyMessages = function (arrayOfGroups,callback) {
    console.log("arrayOfGroups length :: " + arrayOfGroups.length);
    console.log("arrayOfGroups type :: " + typeof arrayOfGroups);
    if(typeof arrayOfGroups == "object" && arrayOfGroups.length>0) {
        var data = "";
        //var opts = {};
        for(var i=0;i<arrayOfGroups.length;i++) {
            if (i>0)  {
                data+="^OR";
            }
            data += "group.sys_id=" + arrayOfGroups[i];
           
        }
        this.post("messages",null, {query:data},function(error,resp) {
            if(!error) {
                //console.log(resp);    
                callback(error,resp);
            }
           
        });
    }
};
	

Client.prototype.objSize = function (object,callback) {
    var size = 0;
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    callback(size);
};

/**
 * Standard handler for handling ServiceNow REST responses 
 * @private
 */
function resultHandler(err,response,body,callback) {
    var error = jsonServiceErrorProcessor(err,response,body);
    
    if(error) {
        console.log("ERROR: " + error)
        callback(error);
        return;
    }
    var o = JSON.parse(body);
   
    if(o.result){
        callback(null,o.result);
    } else if(o.error) {
        
        callback(o.error,null);
    }

}

/**
 * Takes arguments from request callback and if any error result is found, returns the error
 * Any per-record errors are returned as an array of __error objects with message and reason
 * @private
 */
function jsonServiceErrorProcessor(error,response,body) {
    if(error) return error;
    if(response.statusCode!=200) return body;

    var o = JSON.parse(body);
    if(o.error) return o.error;
    if(o.records) {
        var errors = [];
        for(var i in o.records) {
            if(i.__error) errors.push(i.__error);
        }
        if(errors.length>0) {
            return errors;
        }
    }
    return null;
}

module.exports.Client = Client;
