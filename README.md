= simpleflow for Node.js

* http://github.com/neyric/simpleflow-node

== DESCRIPTION:

Simple workflow execution

== FEATURES/PROBLEMS:


== SYNOPSIS:


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


== REQUIREMENTS:

* Node.js >= 0.2.0
* [npm](http://github.com/isaacs/npm)

== INSTALL:

npm install simpleflow


== TODO

* loops not implemented
* conditional not implemented


== Note on Patches/Pull Requests
 
* Fork the project.
* Make your feature addition or bug fix.
* Add tests for it. This is important so I don't break it in a
  future version unintentionally.
* Send me a pull request. Bonus points for topic branches.


== LICENSE:

Copyright (c) 2010 Eric Abouaf

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.