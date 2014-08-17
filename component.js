/*
var example_component_description={
 name:'announcer',
 inputs: {
          //'announcer':{'zmqport':zmqport.replace(/\*|127.0.0.1/,zmq_getExternalIp()}
		 },
		 //output not neded only needed to detect unconnected fully components which is rare case
 //outputs:{'dbinserter':{'zmqport':zmqport.replace(/\*|127.0.0.1/,zmq_getExternalIp()},
 //         'dataprocessor':{'zmqport':zmqport.replace(/\*|127.0.0.1/,zmq_getExternalIp()}
 //        }
};
*/

var zmq = require('zmq'),XXH=require('xxhashjs');

require('./dedupsendreceive.js');

zmqport = 'tcp://127.0.0.1:7845'; //not used
zmqsockets=[]; // list of connected sockets for debugging

//zmqclientid="";
zmqdedupprint=false;
zmq_print_masterdbg=false;

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
	           //  'dbinserter':{'zmqport':zmqport.replace(/\*|127.0.0.1/,zmq_getExternalIp()},
			   //         'dataprocessor':{'zmqport':zmqport.replace(/\*|127.0.0.1/,zmq_getExternalIp()}
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
	
	
	var dedupsendstate1= {count_send:0};
	var h=XXH( 'undefined' , 0xABCD ).toString(16)+dedupsendstate1.count_send;
	dedupsendstate1.prev_send=h;
	//dedupsendstate1.prevhashes.push(h);
	
	
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

		var receivestate1={emitedh:[],emitedt:[],emitedd:[],queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
	
        var h=XXH( 'undefined' , 0xABCD ).toString(16)+"0";	
		receivestate1.emitedt.push(new Date().getTime());
        receivestate1.emitedh.push(h);
        receivestate1.emitedd.push('undefined');
	
		zmqs_bitstamp_log.other_component_name=other_component_name;
		zmqs_bitstamp_log.dedup_receivestate=receivestate1;
		servers.push(zmqs_bitstamp_log);
		component_description.inputs[other_component_name]={'zmqport':zmqs_bitstamp_log.last_endpoint,externalip:zmq_getExternalIp()} // bitstamp_announcer can connect to this port
		if(!clients[other_component_name]){clients[other_component_name]=[];} var other_clients=clients[other_component_name];
		zmqs_bitstamp_log.sendclients=function(datatosend,datatohash){return sendclients(datatosend,datatohash,other_clients)};		
		if(onmessage)zmqs_bitstamp_log.on("message", function(str){
		 var str2=str.toString();
		 if(str2.indexOf("undefined", str2.length - "undefined".length) !== -1)
		 {
		   if(component_description.setmaster)
		   {
		    console.log(" dedup receive undefined will check is master ",new Date().toGMTString());
            checkisportmaster(zmqs_bitstamp_log);
		   }
		   else
		    console.log(" dedup receive undefined. no need to check is master. no component_description.setmaster",new Date().toGMTString());
		 }
		 var re=dedupreceive(str2,receivestate1);
		 return onmessage(re);
		});  //function onmessage(str){}
		return zmqs_bitstamp_log;
	} 
	
	function sendclients(datatosend,datatohash,selectedclients)
	{
	  var data=dedupsend(datatosend,dedupsendstate1,clientid,datatohash);//sends repeated data as diferent hashes, to be able to send same data multiple times despite the de duplication
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
	   sendclients(undefined);
	  }
	  sendundefined();
	  setTimeout(sendundefined,2000);
	  setTimeout(sendundefined,4000);
	  setTimeout(sendundefined,6000);
	  setTimeout(sendundefined,8000);
	  setTimeout(sendundefined,10000);
	  setTimeout(sendundefined,12000);
	  setTimeout(sendundefined,14000);
	  setTimeout(sendundefined,16000);
	  setTimeout(sendundefined,18000);
	  setTimeout(sendundefined,20000);
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
	 var masterpeername= zmq_telepathine.get('last_component.'+component_description.name+'.'+other_component_description_name+'.peer');
	 
	 var fm=checkisfutureportmaster(zmqs1,masterpeername);
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
	  
	  var setmaster=false;
	  //zmq_print_masterdbg=true
	  if(!masterpeername) //masterpeername not defined yet
	  {
	   if(zmq_print_masterdbg)console.log(" !masterpeername ",masterpeername);
  	   setmaster=true; //no master
	  }
	  else if(masterpeername==zmq_telepathine_self.peer_name) //i am master do nothing
  	  {
	    if(zmq_print_masterdbg)console.log(" masterpeername==zmq_telepathine_self.peer_name");
        //	  setmaster=true; //no master
	  }
	  else if( !zmq_telepathine.peers[ masterpeername ].alive ) //not i am alive  or i am master
	  {
	    if(zmq_print_masterdbg)console.log(" !zmq_telepathine.peers[ masterpeername ].alive");
	    setmaster=true;
	  }
	  
	  if(setmaster)
 	  {
 	   console.log('setmaster '+component_description.name+' for '+other_component_description_name+' - master dead. back to us');
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
	  }
	  return true;
	}
	// var c=zmq_telepathine_added_components[1]//inserter
	// zmq_telepathine.get('last_component.'+c.name+'.'+c.servers[0].other_component_name+'.peer.future');
	function checkisfutureportmaster(zmqs1,currentmasterpeername)
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
      //var fromhash=c.getportmasterfrom(c.servers[0])
	  //var emitedh=c.servers[0].dedup_receivestate.emitedh;
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
 	   //console.log(component_description.name+' for '+other_component_description_name+' - future master dead. back to us');
	   //setfutureportmaster(zmqs1/*,other_component_description_name*/);
	   return false;
	  }
	  if( zmq_telepathine.get('last_component.'+component_description.name+'.'+other_component_description_name+'.future') !=zmqs1.last_endpoint) {console.log(component_description.name+' for '+other_component_description_name+' - i am not future master'); return false;}

	  if(currentmasterpeername==masterpeername)//if master changed but only if the result is true not before that
	  {
	   removefutureportmaster(zmqs1);
	   removeportmasterfrom(zmqs1);
	   return null;
	  }
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
	   var emitedh=zmqs1.dedup_receivestate.emitedh;
	   if(emitedh.length==0) return;//probably can be handled by emmiting event asking clients to send undefined once and after some time to retry // probably will be unmasteed by disconnect - may miss some events
	   
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
				  zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'.future',zmqs1.last_endpoint,new Date().getTime()+2500);
				  zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'.peer.future',zmq_telepathine_self.peer_name,new Date().getTime()+2500);
				  console.log("telepathine.set:",'last_component.'+component_description.name+'.'+other_component_description_name+'.peer.future',zmq_telepathine_self.peer_name,new Date().getTime()+2500);
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
	   if(emitedh.length==0) return;//probably can be handled by emmiting event asking clients to send undefined once and after some time to retry
	   var from_hash=emitedh[emitedh.length-1];
	   zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'.from_hash',from_hash);
	   console.log("telepathine.set:",'last_component.'+component_description.name+'.'+other_component_description_name+'.from_hash',from_hash);
	}
	
	function removeportmasterfrom(zmqs1)
	{
	   var other_component_description_name=zmqs1.other_component_name;
	   zmq_telepathine.set('last_component.'+component_description.name+'.'+other_component_description_name+'.from_hash',"removed",new Date().getTime()+2500);
	   console.log("telepathine.set:",'last_component.'+component_description.name+'.'+other_component_description_name+'.from_hash',"removed",new Date().getTime()+2500);
	}
	
	return component_description;
}
