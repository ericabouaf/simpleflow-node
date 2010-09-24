
var http = require('http'),
	 querystring = require('querystring'),
    URL = require('url'),
	 sys = require('sys'),
    fs = require('fs'),
	 ejs = require('ejs'),
    xml2js = require('xml2js');


/**
 * Core modules
 *
 * Module functions takes two arguments, the params object, and the callback.
 * They MUST return an object !
 *
 */
var CoreModules = {
		
	input: function(p, cb) {
	  var key = p["input"]["name"];
	  if( p.hasOwnProperty(key) ) {
			cb({"out": p[key] });
	  }
	  else {
			cb({"out": p["input"]["value"] });
	  }
	},
	
	output: function(params, cb) {
		cb({"out": params["in"] });
	},
	
	comment: function(params, cb) {
		cb({});
	},
	
	YQL: function(params, cb) {
		cb({"results": ["blabla"]});
	},
	
	email: function(params, cb) {
		
		var Email = require('email').Email
		    myMsg = new Email({
		      from: 'noreply@webhookit.com',
		      to:   params["to"],
		      subject: params["subject"],
		      body: params["body"]
		    });

		// if callback is provided, errors will be passed into it
		// else errors will be thrown
		myMsg.send(function(err){
			if(err) {
				cb({"out": {error: err.message} });
			}
			else {
				cb({"out": "Success" });
			}
		});
		
	},
	
	HTTP: function(params, cb) {
		
		var url = URL.parse(params["url"]);
	
		var urlparams = {};
		params["urlparams"].forEach(function(p) {
			urlparams[p[0]] = p[1];
		});
		
		var port = url.port;
		if(!port) { port = 80; }
		
		var ssl = false;
		if( params["url"].substr(0,5) == "https" ) {
			ssl = true;
			port = 443;
		}
		
		var client = http.createClient(port, url.hostname, ssl);
		var path = url.pathname || '/';
		
		//if(params.method == "GET" || params.method == "DELETE") {
			path += '?'+querystring.stringify(urlparams);
		//}
		
		var request = client.request(params.method, path, {'host': url.hostname, "content-type": "application/x-www-form-urlencoded"});
		request.end();
		request.on('response', function (response) {
		  console.log('STATUS: ' + response.statusCode);
		  console.log('HEADERS: ' + JSON.stringify(response.headers) );
		  response.setEncoding('utf8');
		  var complete = "";
		  response.on('data', function (chunk) {
			 	complete += chunk;
		  });
		  response.on('end', function () {
			
				r = complete;
				
				if(response.headers["content-type"]) {
					
					if( response.headers["content-type"] == "application/json" ||
						 response.headers["content-type"] == "text/javascript" ||
						 response.headers["content-type"] == "application/javascript") {
						r = JSON.parse(complete);
					}
				
					if(response.headers["content-type"] == "text/xml") {
						
						var parser = new xml2js.Parser();
						parser.addListener('end', function(result) {
						    cb({out: result });
						});
				    	parser.parseString(complete);
						return;
						
					}
				}
			
				cb( {out: r} );
		  });
		
		});
		
	},
	
	
	/**
	 * Template using EJS
	 */
	template: function(params, cb) {
		var error, result;
		try {
			result = ejs.render(params["template"], { locals: params["in"] });
		} catch(ex) {
			error = ex;
		}
		if(error) {
			console.log(JSON.stringify(error));
			cb( {error: error.message} );
		}
		else {
			cb( {out: result} );
		}
	},
	
	/**
	 * ObjectBuilder
	 */
	ObjectBuilder: function(params, cb) {
		var obj = {};
		params["items"].forEach( function(pair) {
			var key = pair[0];
			var val = pair[1];
			obj[key] = val;
		});
		cb( {out: obj} );
	}
	
};



var execModule = function(name, p, cb, find_method) {
   // Execute Ruby base modules
   if( CoreModules[name] ) {
  		CoreModules[name](p, cb);
	}
   else {
      // Try to execute composed module
		if(find_method) {
			find_method(name, function(w) {
				
				if(!w) {
					throw new Error("Module "+name+" not found !");
				}
				else {
					run(w, p, false, find_method, cb);
				}
				
			});
		}
		else {
			throw new Error("Module "+name+" not found ! (You may want to specify a find_method !)");
		}
	}
};


/**
 * Run method
 */
var run = function(config, params, debug, find_method, cb) {
	
    var wires = config.wires,
		  modules = config.modules;
     
	 // Store the output results of each sub-module
    var execValues = {};
	 var pendingModules = [];
	
	 var step = function() {
		
        // List modules that must be executed
		  var moduleIdsToExecute = []; 
		  for( var mId = 0 ; mId < modules.length ; mId++) {
          if( !execValues[mId] && pendingModules.indexOf(mId) == -1 ) { // don't re-execute modules
     			// If none incoming wires contains a value
            if( !wires.some(function(w) { return (w["tgt"]["moduleId"] == mId) && !execValues[ w["src"]["moduleId"] ]; }) ) {
            	moduleIdsToExecute.push(mId);
				}
          }
        }
	
		  if(moduleIdsToExecute.length === 0) {
		
		  		// we must wait until all modules are finished
				if( pendingModules.length !== 0 ) {
					return;
				}
		
				// Return internal execution values if debug mode
			 	if(debug) {
		    		cb(execValues);
					return;
			 	}

			 	var outputValues = {};

				for(var k = 0 ; k < modules.length ; k++) {
					var m = modules[k];
					if(m.name == "output") {
						wires.forEach(function(w) { 
							if(w["tgt"]["moduleId"] == k && execValues[w["src"]["moduleId"]]) {
					          outputValues[m["value"]["name"]] = execValues[w["src"]["moduleId"]][ w["src"]["terminal"] ];
				           }
						});
					}
				}

				cb(outputValues);
			
				return;
		  }
			
			console.log("moduleIdsToExecute : "+JSON.stringify(moduleIdsToExecute));
			console.log("pendingModules : "+JSON.stringify(pendingModules));
			
			// start all modules that can be executed 
			moduleIdsToExecute.forEach(function(moduleId) {
				
	         var m = modules[moduleId], p = {}, key;
	
	         // params passed to the run method
				for(key in params) { p[key] = params[key]; }
	         // default form values
				for(key in m["value"]) { p[key] = m["value"][key]; }

				// console.log("Wires: "+JSON.stringify(wires) );

	         // incoming wire params
				wires.filter(function(w) { return w["tgt"]["moduleId"] == moduleId; }).forEach( function(w) {
					
							console.log("Incoming wire: "+JSON.stringify(w) );

							var key =  w["tgt"]["terminal"];
							var val = execValues[ w["src"]["moduleId"] ][ w["src"]["terminal"] ];

							//console.log("Incoming wire: "+key+" , value: "+JSON.stringify(val) );

							// We simply want to do p[key] = val,
							// except that key might look like   "myvar[1][firstname]"
							// which mean we have to store this val in p["myvar"][1]["firstname"] instead
							var push_to = p;
							
							var matches = key.match(/\[([^\]]+)*\]/g);
							var pathItems = [];
							if(matches) {
								pathItems = key.match(/\[([^\]]+)*\]/g).map(function(i){ var s = i.substr(1,i.length-2); return (s.match(/\d+/)) ? parseInt(s,10) : s; });
							}
							if(pathItems.length > 0) {
								push_to = push_to[key.match(/^([^\[]*)/)[0]];
							}
							if(pathItems.length > 1) {
								for(var i = 0 ; i < pathItems.length-1 ; i++) {
									push_to = push_to[  pathItems[i]  ];
								}
							}
							if(pathItems.length > 0) {
								key = pathItems[pathItems.length-1];
							}
	               	push_to[key] = val;
					
						} );
				

				 pendingModules.push(moduleId);

				  var close = function(name, p, moduleId) {
						return function() {							
							console.log("\n->Starting "+name+" MODULE with : "+JSON.stringify(p) );
							execModule(name, p, function(results) {
									console.log( "\n<-Finished "+name+" MODULE with : "+ JSON.stringify(results) );
									
									pendingModules.splice( pendingModules.indexOf(moduleId) ,1);
									
									// Store the results of this module
									execValues[moduleId] = results;

									step();
							  }, find_method);
						};
					};

				  // Make sure we call the execModule function outside this stack
				  setTimeout(close(m["name"], p, moduleId), 0);

			});
		
	 };
	

	step();

};

exports.run = run;
