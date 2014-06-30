// this does data collection + inserting , processing and inserting using p2p components self discovery and connection
//
// not sure if need to limit zmq high water limit to something small or and maybe to reconect the same socket on connection loss.// maybe add predictable unique names to sockets of componets so data will reflow by zmq correctly on reconnect. maybe to maintain a starting point to reprocess from and load from database.
//
// to run this you need zmq.js and distcomponents.js and npm insta  xxhashjs, and install telepathine module from git and replace in it the file telepathine.js with my file(it makes beleive work as expected)
// made on 24/6/2014 expected to run on node 0.10...

process.on('uncaughtException', function (err)
{
 run=false;
 console.log('Caught exception2: ' + (err.stack||err));
});

//it creates 3 components
//example_announcer
//example_dbinserter
//example_processor
// after telepathine is initiated

//flat=require('./flat.js'); // herarchical objects to 1 level cols object //https://gist.github.com/shimondoodkin/18944ba65339a871f8cf
//require('./dbconfig.js'); //maintaions connetion to database and contains a global function dbinsert(table_name,{col:value...}) have your own sqlclient.insert, i use vertica.

require('./index.js') //require('p2p-dist-components')

if(!global.appid)appid=Math.round(Math.random()*10000)+1;// to debug concurrent database inserts.

if(global.run==undefined)run=true;//for debug stop anouncer

example_announcer_start=function()
{
    var component_description=zmq_new_component_description('example_announcer');
	//no inputs
	//just clients  that connect to servers that want our information

	
		
	var sendclients_dbinserter=component_description.sendclients
	 

	// put here some event emmiter subscription code,
	// that on('data') does:
    //    component_description.sendclients( data )
	
	// the kind of simple emiter of data to insert
	setInterval(function(){/// T
	if(!run)return;
	var d = new Date();
    var n = (d.getMinutes()*60)+d.getSeconds();
	n=Math.floor(n/3);
	var messagetype='time';
	var data=n;
	sendclients_dbinserter([messagetype,data])
	},3000);
	
	
	zmq_telepathine_addcomponent(component_description);
	
	return component_description;
}



example_dbinserter_start=function()
{
    var component_description=zmq_new_component_description('example_dbinserter');
	//accept example_announcer:
	var zmqs_example_log=component_description.addportfor('example_announcer',function(re)
	{
	 if(re!==undefined)
	 {
	  if(!component_description.checkisportmaster(zmqs_example_log)) { return;}
	  //var x=flat.flat(re);x['app']=appid;
	  //console.log('dbinsert');
      //console.log('dbinsert','public.example_log',x);
	  console.log('dbinsert','public.example_log',re);
	  //dbinsert('public.example_log',x);
	 }
	});
		
	var zmqs_insert=component_description.addportfor('example_processor',function(re)
	{
	 if(re!==undefined)
	 {
	  if(!component_description.checkisportmaster(zmqs_insert)) { return;}
	  //var x=flat.flat(re);x['app']=appid;
	  //console.log('dbinsert2');
      console.log('dbinsert2',re[0],re[1]);
	  //dbinsert('public.example_log',x);
	 }
	});

	Object.defineProperty(component_description, "setmaster", { value : function(){
		component_description.setportmaster(zmqs_example_log,'example_announcer');
		component_description.setportmaster(zmqs_insert,'example_processor');
	} }); //, enumerable:false is default

	zmq_telepathine_addcomponent(component_description);
	component_description.setmaster();
	return component_description;
}

example_processor_start=function()
{
    var component_description=zmq_new_component_description('example_processor');
	
	//there is 
	//zmqs_example_log.sendclients(datatosend,datatohash=undefined)

	var sendclients_dbinserter=component_description.sendclients;
	
	var clientid=Math.round(Math.random()*1000)+1;
    
	function ex_dbinsert(t,d)
	{
	 sendclients_dbinserter([t,d])
	 //sendclients_dbinserter([t,d])
	}
	
	
	var zmqs_example_log=component_description.addportfor('example_announcer',function(re)
	{
	 console.log('example processor: received data');
	 if(re!==undefined)
	 {
	  //console.log('example processor:  data=',re);
	  re[1]='processed'+re[1];
	  if(re[0]=='time') ex_dbinsert('public.time',re[1]); /// T
	  
	  //var x=flat.flat(re);x['app']=appid;
      //console.log('dbinsert','public.example_log',x);
	  //dbinsert('public.example_log',x);
	 }
	});
	
	zmq_telepathine_addcomponent(component_description);
	return component_description;
}


zmq_telepathine_onstart=function ()
{
 setTimeout(function(){
 example_announcer_start();
 example_dbinserter_start();
 example_processor_start();
 },5500);// at last needs at last 2 heart beats to be marked alive first 1st sync to happen before starting otherwise it sets master and than it reverses back because peer not alive yet // time out to be able to set run=false  to stop it from emiting announces to do debug work, not requiered
}

var readline = require('readline');

var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("plese type remote seed ip:port or enter for none", function(answer) {
  zmq_telepathine_start(5000,answer);
  rl.close();
  var  repl = require("repl");repl.start({ useGlobal:true,  useColors:true, });
});


