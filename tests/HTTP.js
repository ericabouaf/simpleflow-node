
var simpleflow = require('./simpleflow');


simpleflow.run(
	
	{
		modules: [
		
			{
				name: "input",
				value: {
					input: { value: 'show tables' , name: "query" }
				}
			},
		
			{
				name: "HTTP",
				value: {
					"method": "GET",
					url: "http://query.yahooapis.com/v1/public/yql",
					"urlparams": [ ["q", 'show tables'], ["diagnostics", true], ["format", "json"]]
				}
			}
		],
		wires: [
			{
				"src": { moduleId: 0, terminal: "out" },
				"tgt": { moduleId: 1, terminal: "query" }
			}
		]
	}, 
	
	{}, 
	
	true, 
	
	function() {
		
	},
	
	function(results) {
		console.log("Results: "+ JSON.stringify(results) );
	}
	
);
