/*
 *
 * Node.js P2P Distributed Components
 * License 2 Close BSD: Copyright to Shimon Doodkin helpmepro1@gmail.com
 *
 */


var zmq = require('zmq'),EventEmitter = require("events").EventEmitter,XXH=require('xxhashjs');


zmqport = 'tcp://127.0.0.1:7845'; //not used
zmqsockets=[]; // list of connected sockets for debugging

//zmqclientid="";
zmqdedupprint=false;


zmqlisten=function (port,name) 
{
  var socket = zmq.socket('sub'); //pull = downstream
  //socket.setsockopt('hwm', 1) ;
  //socket.hwm=1;
  //socket.setsockopt('swap', 25000000) // specify swap space in bytes
  socket.subscribe('');
  zmqsockets.push(socket);// for debug
  //socket.subscribe('');
  socket.identity = 'downstream' + (name||process.pid);
  
  socket.bindSync(port!==undefined?port:zmqport)
  console.log('zmqlisten - bound!',socket.last_endpoint);
  socket.port=socket.last_endpoint;
	
  //socket.on('message', function(data) {
  ////	zmqevents.emit(data.toString());
	//console.log(socket.identity + ': received data ' + data.toString(),r);
  //});
  
  return socket;
}

zmqconnect=function (zmqport,name)
{
      //if(clientid!==undefined)zmqclientid=clientid;
	  var socket = zmq.socket('pub'); // push = upstream
	  
	  zmqsockets.push(socket);
	  socket.identity = 'upstream' + process.pid;
	  socket.connect(zmqport);
	  //socket.setsockopt('hwm', 1) ;
	  //socket.hwm=1;
      //socket.setsockopt('swap', 25000000) // specify swap space in bytes // http://zguide.zeromq.org/js:durapub2 // http://zguide.zeromq.org/js:_start 
	  console.log(name+' zmqconnect connected!',socket.last_endpoint);
	  return socket;
}

zmqdedupsend=function(data,state,clientid,hashdata)// var state= {prev_send:null,count_send:0,zmqsend:zmqsend}
{
 //if(clientid===undefined)clientid=zmqclientid;
 //console.log('send ',data);
 var hashstring,d
 
 if(hashdata) //custom case
 {
  hashstring=JSON.stringify(hashdata);
  d=JSON.stringify(data);
 }
/* else if(data&&data.a1_otimestamp) //my case
 {
  var dataclone=JSON.parse(d=JSON.stringify(data))
  dataclone.a1_otimestamp=Math.round(dataclone.a1_otimestamp/30000);
  hashstring=JSON.stringify(dataclone);
 }
 else if(data&&data.timestamp) //probable case
 {
  var dataclone=JSON.parse(d=JSON.stringify(data))
  dataclone.timestamp=Math.round(dataclone.timestamp/30000);
  hashstring=JSON.stringify(dataclone);
 }
 */
 else // no relativly simular timestamps
 {
  d=hashstring=JSON.stringify(data);
 }
 if(state.prev_send==hashstring) state.count_send++; else  state.count_send=0;
 var h = XXH( hashstring , 0xABCD ).toString(16)+state.count_send;
 state.prev_send=hashstring;
 state.prevhashes.push(hashstring);
 if(state.prevhashes.length>500)
  state.prevhashes.splice(0,state.prevhashes.length-250);
 return clientid+' '+h+' '+d;
}
//example:
//var sendstate1= {prev_send:null,count_send:0}
//var clientid1=1
//zmqsocket.send(zmqdedupsend(object,sendstate1,clientid1));



dedupreceive=function (str,state) { //var state={emitedh:[],emitedt:[],emitedd:[]}
   var r=str.split(' ',2);r[2]=str.substring(r[0].length+r[1].length+2, str.length);
   var client=r[0],hash=r[1],data=r[2];
   if(state.emitedh.lastIndexOf(hash)==-1)
   {
    //console.log('orig ',data);
    state.emitedt.push(new Date().getTime());
    state.emitedh.push(hash);
    //state.emitedd.push(data);
    var t=new Date().getTime();
    if(t-state.emitedt[0]>120000)
    {
     var i,emitedt=state.emitedt;
     for(i=0;i<emitedt.length&&t-emitedt[i]>60000;i++){}
	 if(zmqdedupprint) console.log('cleanup array remove '+i+' from '+emitedt.length)
  	 state.emitedt.splice(0,i);
     state.emitedh.splice(0,i);
     //state.emitedd.splice(0,i);
    }
    if(zmqdedupprint) console.log("dedupreceive ",client,hash,data);
	return JSON.parse(data);
   }
   else
   {
    if(zmqdedupprint) console.log('dedupreceive dup ',client,hash,data);
    return undefined;
   }  
}
//example
//var receivestate1={emitedh:[],emitedt:[],emitedd:[]}
//zmqsocket.on("message", function(str)
//{
// var re=dedupreceive(str.toString(),receivestate1);
// if(re!==undefined) console.log(re);
//});

//example2: other possible use  localy
//
//var receivestate1={emitedh:[],emitedt:[],emitedd:[]}
////var sendstates={};
//function onrow(clientid,object)
//{
// if(!(clientid in sendstates))sendstates[clientid]={prev_send:null,count_send:0};
// var sendstate1=sendstates[clientid]
// var re=dedupreceive(zmqdedupsend(object,sendstate1),receivestate1);
// if(re!==undefined) console.log(re);
// else  console.log('duplicate' object);
//};


//////gosip discovery

function getExternalIp() {
	var ifconfig = require('os').networkInterfaces();
	var device, i, I, protocol;
 
	for (device in ifconfig) {
		// ignore network loopback interface
		if (device.indexOf('lo') !== -1 || !ifconfig.hasOwnProperty(device)) {
			continue;
		}
		for (i=0, I=ifconfig[device].length; i<I; i++) {
			protocol = ifconfig[device][i];
 
			// filter for external IPv4 addresses
			if (protocol.family === 'IPv4' && protocol.internal === false) {
				//console.log('found', protocol.address);
				return protocol.address;
			}
		}
	}
    console.log('External Ip Not found!');
	return '127.0.0.1';
}
zmq_getExternalIp=getExternalIp;

var net=require('net')
function getPort (portrange,cb) {
  var server = net.createServer()
  server.listen(portrange, function (err) {
    server.once('close', function () {
      cb(portrange)
    })
    server.close()
  })
  server.on('error', function (err) {
    getPort(portrange+1,cb)
  })
}

zmq_getPort=getPort;

var Telepathine = require('telepathine').Telepathine;

zmq_telepathine=null
zmq_telepathine_self=null
zmq_telepathine_start=function(startport,toipandport)
{
    if(!startport)startport=5000;
	//toipandport can be false

	var options = {
		gossipIntervalMS: 2500,
		heartBeatIntervalMS: 2500,		
		address: getExternalIp(),
		addressMap: {'127.0.0.1': getExternalIp() }
	};

	// Create peers and point them at the seed 
	// Usually this would happen in separate processes.
	// To prevent a network's single point of failure, design with multiple seeds.

	getPort(startport,function(port){
	    var autoports=[];
		if(port!=startport)autoports.push("127.0.0.1:"+startport)
		//if(port!=5001)autoports.push("127.0.0.1:"+5001)
		//if(port!=5002)autoports.push("127.0.0.1:"+5002)
		//if(port!=5003)autoports.push("127.0.0.1:"+5003)
		var a=zmq_telepathine=new Telepathine(port,!toipandport?autoports:[toipandport ], options).start();
		a.on('start', function (self) {
		    zmq_telepathine_self=self;
			console.log('zmq_telepathine on port '+port);
			
			var a=self;
		
			a.hear('componentonline', function (data, fromPeer)
			{
				zmq_telepathine_process_add(fromPeer,data);
				console.log('hear  componentonline  received ', this.event, '=', data, 'from', fromPeer);
			});	
			
			a.hear('componentoffline', function (data, fromPeer)
			{
				console.log('hear  componentonline  received ', this.event, '=', data, 'from', fromPeer);
			});
			
			a.hear('componentunmastered', function (data, fromPeer)
			{
			    zmq_telepathine_process_unmastered(fromPeer,data);
				console.log('hear  componentunmastered  received ', this.event, '=', data, 'from', fromPeer);
			});
			
			a.hear('componentpleaseunmaster', function (data, fromPeer)
			{
			    zmq_telepathine_process_pleaseunmaster(fromPeer,data);
				console.log('hear  componentpleaseunmaster  received ', this.event, '=', data, 'from', fromPeer);
			});
			
			
			var emptyfunction=function(){};
			a.hear('bye', function (data, fromPeer)
			{
				if(a.peers[fromPeer].markAlive===emptyfunction){
					console.log('already hear  bye  received ', this.event, '=', data, 'from', fromPeer);
				return;
				}
				console.log('hear  bye  received ', this.event, '=', data, 'from', fromPeer);
				
				var markAliveb=a.peers[fromPeer].markAlive;	a.peers[fromPeer].markAlive=emptyfunction;
				setTimeout(function(){
				 if(a&&a.peers&&a.peers[fromPeer])a.peers[fromPeer].markAlive=markAliveb;// if still there give markAlive back
				},5600);				
				a.peers[fromPeer].markDead();
				zmq_telepathine_process_peer_disconect(fromPeer)
				
			});
			
			a.believe('*', function (peer, k,v,expiresAt) {
				//console.log(peer  + " after believe of "+k+ ' with value '+v);
				console.log('6 a me '+a.peer_name + " get "+k+"=" + a.get(k),' should be ',v,'peer=',peer," remote value of peer",a.peers[peer]?a.getRemote(peer, k):'no remote');
			});

			//convenience method for key change events, using wildcard
			a.know('*', function (peer,k, v) {
				console.log(this.peer_name + " knows via know('*'.. that peer " + peer + " set " + this.event + "=" + v);
			});
		
			a.on('peer:new', function(peerstate) {  console.log( 'peer discovered',peerstate); })
			a.on('peer:start', function(peer_name) {console.log( 'peer seems alive - peer start',peer_name); })
			a.on('peer:stop', function(peer_name) { console.log( 'peer seems dead - peer stop',peer_name);
			 zmq_telepathine_process_peer_disconect(peer_name)//for all components notify a dead peer
			})
			
			if(zmq_telepathine_onstart)zmq_telepathine_onstart();
		});
	})

	use_handleexit();
}


var exiting=false;
function handleexit(cb)
{
 if( exiting) return;
 exiting=true;
  
  //all unmaster
  zmq_telepathine_self.say("bye");
 
  // assumin just one disconnects, to make exect switch on disconnect
  // also any dedup sender should say in 10 messages from this hash or 1 second of nothing i will mot be master
  // the master should set a key from this has i will be master
  // so all slaves know
  
  setTimeout(function()
  {
   for(var i=0;i<zmq_telepathine_added_components.length;i++)
    zmq_telepathine_added_components[i].close();
	
   setTimeout(function(){if(cb)cb();},1000)//give some time to os to close ports
  },3000)//Telepathine heartBeatIntervalMS + little
}

function handleexit_at_process_on(signal)
{
 process.on(signal,function () {
 console.log('Got '+signal+', will exit in 10 seconds ');
 var num=1;
 var n=setInterval(function(){ console.log(num);   num++;  },1000); 
 var c=setTimeout(function(){ if(n)clearTimeout(n);   process.exit(0);  },10000)     
 handleexit(function(){
  if(c)clearTimeout(c);
  if(n)clearTimeout(n);
  process.exit(0);
 })
 });
}

function use_handleexit()
{
 handleexit_at_process_on('SIGTERM');
 handleexit_at_process_on('SIGINT');
}

zmq_telepathine_process_add=function(p,c)
{
 var acs=zmq_telepathine_added_components;
 for(var i=0;i<acs.length;i++)
 {
  var cc=acs[i];
  //seach is any my component needs this new component
  if(c.name in cc.inputs)
  {
   console.log(''+cc.name+' discoverd that a newly added component '+c.name+' may need '+cc.name+' - say '+cc.name+' is online to all')
   //reply only to him i am here
   zmq_telepathine.say('componentonline',cc);
   zmq_telepathine_process_add(zmq_telepathine.peer_name,JSON.parse(JSON.stringify(cc)));
  }
  if(cc.name in c.inputs)
  {
   if(!cc.isconnected(c))
   {
    console.log(''+cc.name+' discoverd it can connect to '+c.name+' - tring to connect')
    cc.connect(p,c);
   }
   else
   {
    console.log(''+cc.name+' rediscoverd it can connect to '+c.name+' - already connected')
   }
  }
 }
}


zmq_telepathine_process_pleaseunmaster=function(p,c)
{
 if(p==zmq_telepathine.peer_name)
 {
  console.log("don't set self as please unmaster",p,"==",zmq_telepathine.peer_name);
  return;
 }
 var acs=zmq_telepathine_added_components;
 for(var i=0;i<acs.length;i++)
 {
  //seach in any my component needs this new component
  var cc=acs[i];
  if(cc.havemasters&&cc.name==c.name)
  {
   if(cc.havemasters())
   {
    cc.unmaster();
    zmq_telepathine.say('componentunmastered',JSON.parse(JSON.stringify(cc)));// asks others to compete to be a future master
   }
  }
 }
}

zmq_telepathine_process_unmastered=function(p,c)
{
 if(p==zmq_telepathine.peer_name)
 {
  console.log("don't set self as future master when unmastering",p,"==",zmq_telepathine.peer_name);
  return;
 }
 var acs=zmq_telepathine_added_components;
 for(var i=0;i<acs.length;i++)
 {
  var cc=acs[i];
  //seach is any my component needs this new component
  if(cc.setfuturemaster && cc.name==c.name)
  {
   cc.setfuturemaster();
  }
  if(cc.assure_unmaster_of_client &&(c.name in cc.inputs))
  {
   cc.assure_unmaster_of_client();
  }
 }
}

zmq_telepathine_process_peer_disconect=function(peer_name)
{
 var acs=zmq_telepathine_added_components;
 for(var i=0;i<acs.length;i++)
 {
  //seach in any my component needs this new component
  var cc=acs[i];
  cc.disconnect(peer_name);
 }
}



zmq_unmaster_self=function()
{
 var acs=zmq_telepathine_added_components;
 for(var i=0;i<acs.length;i++)
 {
  //seach in any my component needs this new component
  var cc=acs[i];
  if(cc.havemasters)
  {
   if(cc.havemasters())
   {
    cc.unmaster();
    zmq_telepathine.say('componentunmastered',JSON.parse(JSON.stringify(cc)));// asks others to compete to be a future master
   }
  }
 }
}


zmq_unmaster_others=function(p,c)
{
 var acs=zmq_telepathine_added_components;
 for(var i=0;i<acs.length;i++)
 {
  var cc=acs[i];
  if(cc.havemasters)
  {
   zmq_telepathine.say('componentpleaseunmaster',JSON.parse(JSON.stringify(cc)));// asks others to compete to be a future master
  }
 }
}


zmq_setmaster=function(p,c)
{
 var acs=zmq_telepathine_added_components;
 for(var i=0;i<acs.length;i++)
 {
  var cc=acs[i];
  if(cc.setmaster)
  {
   cc.setmaster();
  }
 }
}



/*
var example_component_description={
 name:'announcer',
 inputs: {
          //'announcer':{'zmqport':zmqport.replace(/\*|127.0.0.1/,getExternalIp()}
		 },
		 //output not neded only needed to detect unconnected fully components which is rare case
 //outputs:{'dbinserter':{'zmqport':zmqport.replace(/\*|127.0.0.1/,getExternalIp()},
 //         'dataprocessor':{'zmqport':zmqport.replace(/\*|127.0.0.1/,getExternalIp()}
 //        }
};
*/
zmq_telepathine_added_components=[];

zmq_telepathine_addcomponent=function(component_description)
{
 if(zmq_telepathine===null)
  return setTimeout(function(){zmq_telepathine_addcomponent(component_description)},500);
 
 zmq_telepathine_added_components.push(component_description);
 zmq_telepathine.say('componentonline',component_description);
 zmq_telepathine_process_add(zmq_telepathine.peer_name,component_description);
 //zmq_mesh.send('componentonline', );
}

//handling of component internals
zmq_new_component_description=function (component_name)
{
	// i serialize it later so i hide  from enum all what not need to be serialized
    var component_description={
	 name:component_name,
	 inputs:  {
			   //'announcer':{'zmqport':zmqport,externalip:zmq_getExternalIp()}
			  },
			 //output not neded only needed to detect unconnected fully components which is rare case
	 //outputs: {
	           //  'dbinserter':{'zmqport':zmqport.replace(/\*|127.0.0.1/,getExternalIp()},
			   //         'dataprocessor':{'zmqport':zmqport.replace(/\*|127.0.0.1/,getExternalIp()}
	   //       }
	};
	
	var clients= {
		//'bitstamp_dbinserter': [zmq1,zmq2]
	},
	clients_all=[ 
		//zmq1,zmq2
	], 
	clients_bypeer={
		//'10.0.0.1:45645':[zmq]
	},
	servers=[
		//listening_zmq1,listening_zmq2
	];
	
	var clientid=Math.round(Math.random()*1000)+1;
	var dedupsendstate1= {prevhashes:[],prev_send:null,count_send:0};
	
	Object.defineProperty(component_description, "clients", { value : clients } );
	Object.defineProperty(component_description, "dedupsendstate", { value : dedupsendstate1 } );
	Object.defineProperty(component_description, "clientid", { value : clientid } );//clientid is not required (you can put empty string there) is used to know witch client passed the dedupreceive
	Object.defineProperty(component_description, "clients_all", { value : clients_all } );
	Object.defineProperty(component_description, "clients_bypeer", { value : clients_bypeer } );
	Object.defineProperty(component_description, "servers", { value : servers} );
	Object.defineProperty(component_description, "connect", { value : function(p,c){return connect(p,c)} }); //, enumerable:false is default
	Object.defineProperty(component_description, "original", { value : true }); //, enumerable:false is default
	Object.defineProperty(component_description, "isconnected", { value : function(c){return isconnected(c)} }); //, enumerable:false is default
	Object.defineProperty(component_description, "disconnect", { value : function(p){return disconnect(p)} }); //, enumerable:false is default
	Object.defineProperty(component_description, "close", { value : function(){return close()} }); //, enumerable:false is default
	Object.defineProperty(component_description, "sendclients", { value : function(d,a){return sendclients(d,a)} }); //, enumerable:false is default
	Object.defineProperty(component_description, "addportfor", { value : function(n,f){return addportfor(n,f)} }); //, enumerable:false is default
	Object.defineProperty(component_description, "checkisportmaster", { value : function(n,f){return checkisportmaster(n,f)} }); //, enumerable:false is default
	Object.defineProperty(component_description, "setportmaster", { value : function(n,f){return setportmaster(n,f)} }); //, enumerable:false is default
	Object.defineProperty(component_description, "checkisfutureportmaster", { value : function(n,f){return checkisfutureportmaster(n,f)} }); //, enumerable:false is default
	Object.defineProperty(component_description, "setfutureportmaster", { value : function(n,f){return setfutureportmaster(n,f)} }); //, enumerable:false is default
	Object.defineProperty(component_description, "setportmasterfrom", { value : function(n,f){return setportmasterfrom(n,f)} }); //, enumerable:false is default
	Object.defineProperty(component_description, "getportmasterfrom", { value : function(p){return getportmasterfrom(p)} }); //, enumerable:false is default
	Object.defineProperty(component_description, "havemasters", { value : function(){return havemasters()} }); //, enumerable:false is default
	Object.defineProperty(component_description, "unmaster", { value : function(){return unmaster()} }); //, enumerable:false is default
	Object.defineProperty(component_description, "assure_unmaster_of_client", { value : function(){return assure_unmaster_of_client()} }); //, enumerable:false is default
	
	function addportfor(other_component_name,onmessage)
	{
		//accept bitstamp_announcer:
		var dbinserterport = 'tcp://*:0';
		var zmqs_bitstamp_log=zmqlisten(dbinserterport,component_description.name+' for '+other_component_name);
		var receivestate1={emitedh:[],emitedt:[],emitedd:[]}	
		zmqs_bitstamp_log.other_component_name=other_component_name;
		zmqs_bitstamp_log.dedup_receivestate=receivestate1;
		servers.push(zmqs_bitstamp_log);
		component_description.inputs[other_component_name]={'zmqport':zmqs_bitstamp_log.last_endpoint,externalip:zmq_getExternalIp()} // bitstamp_announcer can connect to this port
		if(!clients[other_component_name]){clients[other_component_name]=[];} var other_clients=clients[other_component_name];
		zmqs_bitstamp_log.sendclients=function(datatosend,datatohash){return sendclients(datatosend,datatohash,other_clients)};		
		if(onmessage)zmqs_bitstamp_log.on("message", function(str){
		 var re=dedupreceive(str.toString(),receivestate1);
		 return onmessage(re);
		});  //function onmessage(str){}
		return zmqs_bitstamp_log;
	} 
	
	function sendclients(datatosend,datatohash,selectedclients)
	{
	  var data=zmqdedupsend(datatosend,dedupsendstate1,clientid,datatohash);//sends repeated data as diferent hashes, to be able to send same data multiple times despite the de duplication
	  //console.log('announcer: clients_all.len',clients_all.length);
	  //var ct=clients.bitstamp_dbinserter;//no search fast local access
	  var ct=selectedclients!==undefined?selectedclients:clients_all;
	  for(var i=0;i<ct.length;i++)
	  {
	   //console.log(component_description.name+': sending data to',ct[i].last_endpoint);
	   ct[i].send(data);
	  }
	}
	
	var clients=component_description.clients
	var dbinserter_clients=component_description.clients.bitstamp_dbinserter
	
	function isconnected(other_component_description)
	{
	    var endpoint=other_component_description.inputs[component_description.name];
		var myexternalip=zmq_getExternalIp();
		var endpointport=endpoint.zmqport.replace(/127.0.0.1|0.0.0.0|\*/,myexternalip==endpoint.externalip?'127.0.0.1':endpoint.externalip);
		return clients_all.filter(function(zmqcon){ return zmqcon.last_endpoint==endpointport}).length>0;
    }


	function disconnect(peer_name)
	{
	  if(! (peer_name in clients_bypeer)) return 
	  
	  console.log('disconnect: peer_name',peer_name);
	  
	  var clients_keys=Object.keys(clients);
	  
	  var ct=clients_bypeer[peer_name];	  
	  for(var i=0;i<ct.length;i++)
	  {
	   var c=ct[i];
	   
	   for(var j=clients_all.length-1;j>=0;j--)
	   {
	    if(clients_all[j]===c)
		{
		 var x=clients_all.splice(j,1)[0];
		 console.log('remove from clients_all: ',x.last_endpoint);
		 break;
		}
	   }

       var b=false;	   
	   for(var k=0;k<clients_keys.length;k++)
	   {
		var clientsk=clients[clients_keys[k]]
		for(var j=clientsk.length-1;j>=0;j--)
		{
		 if(clientsk[j]===c)
		 {
		  var x=clientsk.splice(j,1)[0];
		  console.log('remove from clients['+clients_keys[k]+']: ',x.last_endpoint);
		  var b=true;
		  break;
		 }
		}
		if(b)break;
		//if(clientsk.length==0) delete clients[k] //delete empty property// maybe there is static reference to it so dont break it anyway component_description names are little
	   }
	   
	   for(var j=zmqsockets.length-1;j>=0;j--)
	   {
	    if(zmqsockets[j]===c)
		{
		 var x=zmqsockets.splice(j,1)[0];
		 console.log('remove from zmqsockets: ',x.last_endpoint);
		 break;
		}
	   }
	   var x=ct.splice(i,1)[0];
	   console.log('remove from clients_bypeer['+peer_name+']: ',x.last_endpoint);
	   c.close();
	  } 
	}
	
	//function getunmaster()
	//{
	  //return  zmq_telepathine.get('last_component.'+component_description.name+'.unmaster_peer');
	//}
	
	function unmaster()
	{
	  //zmq_telepathine.set('last_component.'+component_description.name+'.unmaster_peer',zmq_telepathine_self.peer_name);
	  //console.log("telepathine.set:",'last_component.'+component_description.name+'.unmaster_peer',zmq_telepathine_self.peer_name);
	  for(var zmq1s,i=0;i<servers.length;i++)
	  {
	   zmqs1=servers[i]
	   if ( checkisportmaster(zmqs1) ) 
	   {
		setportmasterfrom(zmqs1);
	   }
	  }
	}
	
	function assure_unmaster_of_client() // client waits for 5 hashes to pass to unmaster
	{
	  function sendundefined()
	  {
	   sendclients(undefined,"undefined");
	  }
	  setTimeout(sendundefined,1000);
	  setTimeout(sendundefined,2000);
	  setTimeout(sendundefined,3000);
	  setTimeout(sendundefined,4000);
	  setTimeout(sendundefined,5000);
	}
	
	function havemasters()
	{
	  // this function used: after futureclose if !havemasters() than can exit -> do exit;
	  // go over all zmq listening ports
	  for(var zmqs1,i=0;i<servers.length;i++)
	  {
	   zmqs1=servers[i]
	   if ( checkisportmaster(zmqs1) ) 
	   {
	    return true;
	   }
	  }
	  return false;
	}
	
	function close()
	{
	  //close all clients
	  
	  //console.log('announcer: clients_all.len',clients_all.length);
	    
	  var clients_keys=Object.keys(clients);
	  var peers_keys=Object.keys(clients_bypeer);
	  
	  var ct=clients_all;	
	  for(var i=0;i<ct.length;i++)
	  {
	   var c=ct[i];
	   var b=false
	   for(var k=0;k<peers_keys.length;k++)
	   {
		var clients_bypeerk=clients_bypeer[peers_keys[k]]
	    for(var j=clients_bypeerk.length-1;j>=0;j--)
	    {
	     if(clients_bypeerk[j]===c)
		 {
		  clients_bypeerk.splice(j,1);
		  b=true;
		  break;
		 }
	    }
		if(b) break;
	   }
	   
	   for(var k=0;k<clients_keys.length;k++)
	   {
		var clientsk=clients[clients_keys[k]]
		for(var j=clientsk.length-1;j>=0;j--)
		{
		 if(clientsk[j]===c)clientsk.splice(j,1);
		}
		//if(clientsk.length==0) delete clients[k] //delete empty property// maybe there is static reference to it so dont break it anyway component_description names are little
	   }
	   
	   for(var j=zmqsockets.length-1;j>=0;j--)
	   {
	    if(zmqsockets[j]===c)zmqsockets.splice(j,1);
	   }
	   ct.splice(i,1);
	   c.close();
	  }
	  
	  //close all servers
	  for(var j=servers.length-1;j>=0;j--)
	  {
	   servers.splice(j,1)[0].close();
	  }
	}
	
	//adds another one who would like us to send him our data
	function connect(peer_name,other_component_description)
	{
	    if(!(component_description.name in other_component_description.inputs))
		{
		 console.log(new Error("bitstamp_announcer_start - trying to connect wrong components. "+other_component_description.name+' doesnt have in inputs '+component_description.name+'.').stack," to ","other_component_description=",other_component_description," from " ,'component_description=',component_description)
		 return
		}
			
		//if(isconnected(other_component_description))
		//{
		// console.log(new Error("bitstamp_announcer_start - already connected components. "+other_component_description.name+' doesnt have in inputs '+component_description.name+'.').stack," to ","other_component_description=",other_component_description," from " ,'component_description=',component_description)
		// return
		//}
		
		var endpoint=other_component_description.inputs[component_description.name];
		
		var port=endpoint.zmqport;
		var myexternalip=zmq_getExternalIp();
		port=port.replace(/127.0.0.1|0.0.0.0|\*/,myexternalip==endpoint.externalip?'127.0.0.1':endpoint.externalip);
		var zmq1 = zmqconnect(port,component_description.name+' to '+other_component_description.name);
		if(!clients[other_component_description.name]){clients[other_component_description.name]=[];}
		clients[other_component_description.name].push(zmq1);
		if(!clients_bypeer[peer_name]){clients_bypeer[peer_name]=[];}
		clients_bypeer[peer_name].push(zmq1);
		clients_all.push(zmq1);
		//zmq.on('message', function on_zmq_client_message(zmq_client,message)
		//{
		// console.log('on_zmq_client_message(zmq_client,message) '+message.toString());
		//})
	}
	
	function checkisportmaster(zmqs1/*,other_component_description_name*/)
	{
	 var other_component_description_name=zmqs1.other_component_name;
	 
	 var fm=checkisfutureportmaster(zmqs1);
	 if(fm!==null)
	 {
	      if(fm)
		  {
		    if(!zmqs1.masterset)
			{
			 zmqs1.masterset=true;
			 console.log(component_description.name+' for '+other_component_description_name+' - after getting master from future. set me master');
			 setportmaster(zmqs1,other_component_description_name);
			}
			return true;
			//if furue is came and iam return true and set me to true if i am master , if i am not master return false , put it first above this ismaster
		  }
		  else 
		   return false;
	  }
	  
	  
	  
	  var masterpeername= zmq_telepathine.get('last_component.'+component_description.name+'.'+other_component_description_name+'.peer');
	  
	  var setmaster=false;
	  if(!masterpeername)
  	   setmaster=true; //no master
	  else
	  {
	   if(!( zmq_telepathine.peers[ masterpeername ].alive  || masterpeername==zmq_telepathine_self.peer_name ) ) //not i am alive  or i am master
	    setmaster=true;
	  }
	  if(setmaster)
 	  {
 	   console.log(component_description.name+' for '+other_component_description_name+' - master dead. back to us');
	   setportmaster(zmqs1,other_component_description_name);
	  }
	  if( zmq_telepathine.get('last_component.'+component_description.name+'.'+other_component_description_name+'') !=zmqs1.last_endpoint)
	  {
	   console.log(component_description.name+' for '+other_component_description_name+' - i am not master');
	   return false;
	  }
	  if(zmqs1.masterset) // as became master clean all not needed anymore values.
	  {
	   zmqs1.masterset=false;
	   removeportmasterfrom(zmqs1);
	   removefutureportmaster(zmqs1);
	  }
	  return true;
	}
	
	function checkisfutureportmaster(zmqs1/*,other_component_description_name*/)
	{
	  var other_component_description_name=zmqs1.other_component_name;
	  var masterpeername= zmq_telepathine.get('last_component.'+component_description.name+'.'+other_component_description_name+'.peer.future');
	  if(!masterpeername)return null;
	  if(masterpeername!=zmq_telepathine_self.peer_name)
	  {
		  if(!zmq_telepathine.peers[ masterpeername ].alive)
		  {
		   console.log(component_description.name+' for '+other_component_description_name+' - future master dead. back to us');
		   setfutureportmaster(zmqs1/*,other_component_description_name*/);
		  }
	  }

	  var fromhash=getportmasterfrom(zmqs1);	  
	  var emitedh=zmqs1.dedup_receivestate.emitedh;
	  var p=emitedh.lastIndexOf(fromhash);
	  if(emitedh.length-p>=5&&p!=-1)
	  {;}
	  else
	  {
	   return null;
	  }
	  if(masterpeername!=zmq_telepathine_self.peer_name)
 	  {
 	   //console.log(component_description.name+' for '+other_component_description_name+' - master dead. back to us');
	   //setfutureportmaster(zmqs1/*,other_component_description_name*/);
	   return false;
	  }
	  if( zmq_telepathine.get('last_component.'+component_description.name+'.'+other_component_description_name+'.future') !=zmqs1.last_endpoint) {console.log(component_description.name+' for '+other_component_description_name+' - i am not future master'); return false;}
	  return true;
	}
	
	function setportmaster(zmqs1/*,other_component_description_name*/)
	{
				  var other_component_description_name=zmqs1.other_component_name;
				  zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'',zmqs1.last_endpoint);
				  zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'.peer',zmq_telepathine_self.peer_name);
	   console.log("telepathine.set:",'last_component.'+component_description.name+'.'+other_component_description_name+'.peer',zmq_telepathine_self.peer_name);
	}
	
	
	function setfutureportmaster(zmqs1/*,other_component_description_name*/)
	{
				  zmqs1.masterset=false;
				  var other_component_description_name=zmqs1.other_component_name;
				  zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'.future',zmqs1.last_endpoint);
				  zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'.peer.future',zmq_telepathine_self.peer_name);
	   console.log("telepathine.set:",'last_component.'+component_description.name+'.'+other_component_description_name+'.peer.future',zmq_telepathine_self.peer_name);
	}
	
	function removefutureportmaster(zmqs1/*,other_component_description_name*/)
	{
				  zmqs1.masterset=false;
				  var other_component_description_name=zmqs1.other_component_name;
				  zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'.future',zmqs1.last_endpoint,new Date().getTime());
				  zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'.peer.future',zmq_telepathine_self.peer_name,new Date().getTime());
				  console.log("telepathine.set:",'last_component.'+component_description.name+'.'+other_component_description_name+'.peer.future',zmq_telepathine_self.peer_name,new Date().getTime());
	}
	
	
	function getportmasterfrom(zmqs1)
	{
	  var other_component_description_name=zmqs1.other_component_name;
	  return  zmq_telepathine.get('last_component.'+component_description.name+'.'+other_component_description_name+'.from_hash');
	}
	
	function setportmasterfrom(zmqs1)
	{
	   var other_component_description_name=zmqs1.other_component_name;
	   var emitedh=zmqs1.dedup_receivestate.emitedh;
	   var from_hash=emitedh[emitedh.length-1];
	   zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'.from_hash',from_hash);
	   console.log("telepathine.set:",'last_component.'+component_description.name+'.'+other_component_description_name+'.from_hash',from_hash);
	}
	
	function removeportmasterfrom(zmqs1)
	{
	   var other_component_description_name=zmqs1.other_component_name;
	   zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'.from_hash',"removed",new Date().getTime());
	   console.log("telepathine.set:",'last_component.'+component_description.name+'.'+other_component_description_name+'.from_hash',"removed",new Date().getTime());
	}
	
	return component_description;
}