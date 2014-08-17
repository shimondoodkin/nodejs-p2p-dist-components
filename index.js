/*
 *
 * Node.js P2P Distributed Components
 * License 2 Close BSD: Copyright to Shimon Doodkin helpmepro1@gmail.com
 *
 */


//////gosip discovery
require("./external_ip_and_unused_port.js");
require("./handleexit.js");

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
		address: zmq_getExternalIp(),
		addressMap: {'127.0.0.1': zmq_getExternalIp() }
	};

	// Create peers and point them at the seed 
	// Usually this would happen in separate processes.
	// To prevent a network's single point of failure, design with multiple seeds.

	zmq_getPort(startport,function(port){
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
			
			a.hear('componentfuturemaster', function (data, fromPeer)
			{
			    zmq_telepathine_process_futuremaster(fromPeer,data);
				console.log('hear  componentfuturemaster  received ', this.event, '=', data, 'from', fromPeer);
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
				console.log('6 a me '+a.peer_name + " get "+k+"=" + a.get(k),' should be ',v,'peer=',peer," remote value of peer",a.peers[peer]?a.getRemote(peer, k):'no remote','ttl=',expiresAt);
			});

			//convenience method for key change events, using wildcard
			a.know('*', function (peer,k, v,expiresAt) {
				console.log(this.peer_name + " knows via know('*'.. that peer " + peer + " set " + this.event + "=" + v,'ttl=',expiresAt);
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
  if(cc.assure_unmaster_of_client &&(cc.name in c.inputs))
  {
   cc.assure_unmaster_of_client();
  }
 }
}


zmq_telepathine_process_futuremaster=function(p,c)
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
  if(cc.assure_unmaster_of_client &&(cc.name in c.inputs))
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


/*
FUTURE UNMASTER PROCESS:
1) (1st master)zmq_unmaster_self
    for each component that havemasters
	  1.1) unmaster
	   for each zmq server in component
	     1.1.1) if(checkisportmaster(zmqs1))
	     1.1.2)   setportmasterfrom(zmqs1); // sets component for other component master from = last hash received
		 //----sync heart beat
	  1.2) zmq_telepathine.say('componentunmastered',JSON.parse(JSON.stringify(cc)));// asks others to compete to be a future master
	  //----sync heart beat
2) (2nd master) on componentunmastered zmq_telepathine_process_unmastered(fromPeer,data);
   for each component 
     if component  have setfuturemaster and its name eqals name of component that requested unmaster
      2.1.1) cc.setfuturemaster();  // sets last component for other component future zmq master port = port also sets its future peer ip=peer ip
	  //----sync heart beat
     if component have assure_unmaster_of_client and its name in inputs of component that requested unmaster
      2.1.2) cc.assure_unmaster_of_client(); // set planned emmitions of undefined each 2 seconds from now
	 //----maybe sync heart beat
3) (1st master) on receive undefined 
     //---- receive undefined:
     checkisportmaster(zmqs1)
	    // inside there is:
		fm=checkisfutureportmaster(zmqs1,masterpeername)
		if(fm!=null)
		{
			if(fm) probably equals true after sometime, return null when master=future master
			{
				if(!zmqs1.masterset)// zmqs1.masterset is false
				{
					 zmqs1.masterset=true;
					 console.log(component_description.name+' for '+other_component_description_name+' - after getting master from future. set me master');
					 setportmaster(zmqs1,other_component_description_name);			 
				}
				return true// exit checkisportmaster with true
			}
			return false// not executed onmaster , but on slaves
		}
	 //---- receive undefined:
	 checkisportmaster(zmqs1)
	 // inside there is:
	 //
	 // now: future master=current master, checkisfutureportmaster returns null, and does
			 removeportmasterfrom(zmqs1);
			 removefutureportmaster(zmqs1);
	 // then
		really check if it master
     // then		
	  if(zmqs1.masterset) // as became master clean all not needed anymore values.
	  {
	   zmqs1.masterset=false;
	  }	
	  //then
	   return result of check is master
*/

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


zmq_setfuturemaster=function()
{
 var acs=zmq_telepathine_added_components;
 for(var i=0;i<acs.length;i++)
 {
  var cc=acs[i];
  //seach is any my component needs this new component
  if(cc.setfuturemaster)
  {
    //define from where to be master
   for(var zmq1s,i=0;i<cc.servers.length;i++)
   {
    zmqs1=cc.servers[i]
    if ( !cc.checkisportmaster(zmqs1) ) 
    {
 	 cc.setportmasterfrom(zmqs1);
    }
   }
   // usually then others asked to compete who is the master
   // but this time i just 
   // set myself as master
   cc.setfuturemaster();
   zmq_telepathine.say('componentfuturemaster',JSON.parse(JSON.stringify(cc)));// asks inputs to send nothing
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
 name:'inserter',
 inputs: {
          'announcer':{'zmqport':zmqport,externalip:zmq_getExternalIp()}
		 }
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

require('./component.js');