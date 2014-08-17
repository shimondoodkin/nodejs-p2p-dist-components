
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

use_handleexit=function (handleexit)
{
 handleexit_at_process_on('SIGTERM');
 handleexit_at_process_on('SIGINT');
}