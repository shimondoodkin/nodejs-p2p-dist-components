//xxhashjs replcement tomake it a single module with no dependencies for testing
if (typeof global === 'undefined') 
{
 var global=window;
 var makeCRCTable=function(){for(var r,a=[],e=0;256>e;e++){r=e;for(var n=0;8>n;n++)r=1&r?3988292384^r>>>1:r>>>1;a[e]=r}return a}(), crc32=function(r){for(var a=makeCRCTable,e=-1,n=0;n<r.length;n++)e=e>>>8^a[255&(e^r.charCodeAt(n))];return(-1^e)>>>0},XXH=crc32;
}
else
 var XXH=require('xxhashjs');

 if(!global.zmqdedupprint){zmqdedupprint=true;}

// dedup
// shared receved queue
// sync with queue before starting to return data (maybe be disabled if multiple sources send different data)
// list of last number in shred queue id to search dedup from. // start emiting only when first time it is zero on duplicateid

dedupsend=function(data,state,clientid,hashdata)// var state= {prev_send:null,count_send:0}
{
 if(zmqdedupprint) if(data==='undefined')console.log("zmqdedupsend sending data undefined");
 if(zmqdedupprint) if(hashdata==='undefined')console.log("zmqdedupsend sending hashdata undefined");
 //if(clientid===undefined)clientid=zmqclientid;
 //console.log('send ',data);
 var hashstring,d 
 
 if(hashdata) //custom case
 {
  hashstring=hashdata===undefined?'undefined':JSON.stringify(hashdata);
  d=data===undefined?'undefined':JSON.stringify(data);
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
  d=hashstring=data===undefined?'undefined':JSON.stringify(data);
 }
// if(state.prev_send===hashstring)
//  state.count_send++;
// else 
  state.count_send=0;
 var h = XXH( hashstring , 0xABCD ).toString(16)+(state.count_send==0?'.':state.count_send);
 state.prev_send=hashstring;
 //state.prevhashes.push(hashstring);
 //if(state.prevhashes.length>500)
 // state.prevhashes.splice(0,state.prevhashes.length-250);
 return clientid+' '+h+' '+d;
}
//example:
//var sendstate1= {prev_send:null,count_send:0}
//var clientid1=1
//zmqsocket.send(zmqdedupsend(object,sendstate1,clientid1));

dedupreceive=function (str,state) { //var state={emitedh:[],emitedt:[],emitedd:[],emitedid:[],queues:{}}
   var r=str.split(' ',2);r[2]=str.substring(r[0].length+r[1].length+2, str.length);
   var client=r[0],hash=r[1],data=r[2];
   var q=state.queues[client];
   if(q===undefined)
   {
     state.queues[client]={sync:false,pos:0};
    q=state.queues[client];
   }
   //if(!q.sync&&hash.substring(hash.length-1,hash.length)=='.') q.sync=true; // queue is synced as soon as there is . at end of hash means it is 1st unique value
   if(!q.sync)q.sync=true;
   if(!q.sync)
   {
     if(zmqdedupprint)
	  console.log('queue not synced return undefiend');
     return undefined
   }

   
   var shared_min=q.pos
   
   var parr=state.emitedh.slice(shared_min)
   var p=parr.length==0?-1:parr.lastIndexOf(hash);
   p=p==-1?-1:shared_min+p;
   //if(shared_min!==undefined) { if(p<shared_min) p=-1; } // if not found in small range
   
   console.log("p pos=",p,"shared_min pos",shared_min,"hash=",hash," search in list",state.emitedh.slice(shared_min)," all list:",state.emitedh)
   
   if(p===-1)
   {
    //console.log('orig ',data);
    state.emitedt.push(new Date().getTime());
    q.pos=state.emitedh.push(hash);
    state.emitedd.push(data);
	
    var t=new Date().getTime();
    if(t-state.emitedt[0]>120000)
    {
     var i,emitedt=state.emitedt;
     for(i=0;i<emitedt.length&&t-emitedt[i]>60000;i++){}
	 if(zmqdedupprint) console.log('cleanup array remove '+i+' from '+emitedt.length)
  	 state.emitedt.splice(0,i);
     var delnum=state.emitedh.splice(0,i).length;
     state.emitedd.splice(0,i);
	 Object.keys(state.queues).map(function(k){if(state.queues[k].sync!==false)state.queues[k].sync-=delnum});
    }
	if(zmqdedupprint) if(data==='undefined')console.log("dedupreceive got undefined");
    if(zmqdedupprint) console.log("dedupreceive good ",client,hash,data,"#");
	return data==='undefined'?undefined:JSON.parse(data);
   }
   else
   {
    q.pos=p+1;
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


//tests
//test1// 1 starts ,2 joins (offset numbers)
//test2// 1 starts ,2 joins, 1 leaves
//test3// 1 starts ,2 joins, 1 leaves, 1 joins(output skiped + continues same future numbers)
//test4// 1 starts ,2 joins, 1 leaves, 1 joins(output skiped + restarts numbers)
//test5// 1 starts ,2 joins, 1 leaves, 1 joins(double send + same numbers)
//test6// 1 starts ,2 joins, 1 leaves, (input of 1 was delayed by input) 1 (resend+same numbers)
//test7a// 1 starts ,2 joins, 1 leaves, (input of 1 was skipped by input) 1 sends lower numbers for future mesages  ## problem
//test7b is not a problem for unknown reason
//test8a// 1 starts ,2 joins, 1 leaves, (input of 1 was different by input) 1 sends same numbers but different input ## problem
//test8b
// need change give id from the receiveing side

function test0() 
{
// generate sample data
var sendstate0= {count_send:0},sendstate1= {count_send:0},sendstate2= {count_send:0}
var receivestate={emitedh:[],emitedt:[],emitedd:[],emitedid:[],queues:{}}
//var a0=[1,2,3,4,5,6,7,8,9,10], a1=[1,2,3,4,5,6,7,8,9,10]
var a0=[1,2,3,3,3,3,3,3,3,3], a1=[1,2,3,3,3,3,3,3,3,3]
var a=[];
for(var i=0;i<10;i++)
 a.push(dedupsend(a0.shift(),sendstate0,0))
 console.log(" var a0= ",a);

var a=[];
for(var i=0;i<6;i++)
 a.push(dedupsend(a1.shift(),sendstate1,1))
 console.log(" var a1= ",a);

 var a=[];
for(var i=6;i<10;i++)
 a.push(dedupsend(a1.shift(),sendstate2,1))
 console.log(" var a1= ",a);

 //console.log("got:",pushreturn(arr,dedupreceive(dedupsend(a0.pop(),sendstate0,0),receivestate)),dedupreceive(dedupsend(a1.pop(),sendstate1,1),receivestate)) );
}

function pushreturn(arr,val)
{
 arr.push(val)
 return val;
}
function test1()
{
 var arr=[];
 var a0=  [ '0 83dcefb7. 1',
  '0 1ad5be0d. 2',
  '0 6dd28e9b. 3',
  '0 f3b61b38. 4',
  '0 84b12bae. 5',
  '0 1db87a14. 6',
  '0 6abf4a82. 7',
  '0 fa005713. 8',
  '0 8d076785. 9',
  '0 a15d25e1. 10' ]
 var a1=  [ '1 83dcefb7. 1',
  '1 1ad5be0d. 2',
  '1 6dd28e9b. 3',
  '1 f3b61b38. 4',
  '1 84b12bae. 5',
  '1 1db87a14. 6',
  '1 6abf4a82. 7',
  '1 fa005713. 8',
  '1 8d076785. 9',
  '1 a15d25e1. 10' ]

 var receivestate={emitedh:[],emitedt:[],emitedd:[],emitedid:[],queues:{}}
 
 if(a0[0])console.log("0:",pushreturn(arr,dedupreceive(a0[0],receivestate)));
 if(a1[0])console.log("1:",pushreturn(arr,dedupreceive(a1[0],receivestate)) );
 
 if(a0[1])console.log("0:",pushreturn(arr,dedupreceive(a0[1],receivestate)));
 if(a1[1])console.log("1:",pushreturn(arr,dedupreceive(a1[1],receivestate)) );
 
 if(a0[2])console.log("0:",pushreturn(arr,dedupreceive(a0[2],receivestate)));
 if(a1[2])console.log("1:",pushreturn(arr,dedupreceive(a1[2],receivestate)) );
 
 if(a0[3])console.log("0:",pushreturn(arr,dedupreceive(a0[3],receivestate)));
 if(a1[3])console.log("1:",pushreturn(arr,dedupreceive(a1[3],receivestate)) );
 
 if(a0[4])console.log("0:",pushreturn(arr,dedupreceive(a0[4],receivestate)));
 if(a1[4])console.log("1:",pushreturn(arr,dedupreceive(a1[4],receivestate)) );
 return arr;
 
 if(a0[5])console.log("0:",pushreturn(arr,dedupreceive(a0[5],receivestate)));
 if(a1[5])console.log("1:",pushreturn(arr,dedupreceive(a1[5],receivestate)) );
 
 if(a0[6])console.log("0:",pushreturn(arr,dedupreceive(a0[6],receivestate)));
 if(a1[6])console.log("1:",pushreturn(arr,dedupreceive(a1[6],receivestate)) );
 
 if(a0[7])console.log("0:",pushreturn(arr,dedupreceive(a0[7],receivestate)));
 if(a1[7])console.log("1:",pushreturn(arr,dedupreceive(a1[7],receivestate)) );
 
 if(a0[8])console.log("0:",pushreturn(arr,dedupreceive(a0[8],receivestate)));
 if(a1[8])console.log("1:",pushreturn(arr,dedupreceive(a1[8],receivestate)) );
 
 if(a0[9])console.log("0:",pushreturn(arr,dedupreceive(a0[9],receivestate)));
 if(a1[9])console.log("1:",pushreturn(arr,dedupreceive(a1[9],receivestate)) );
  return arr;
}

function test2()
{
 var arr=[];
 var a0=  [ '0 83dcefb7. 1',
  '0 1ad5be0d. 2',
  '0 6dd28e9b. 3',
  '0 f3b61b38. 4',
  '0 84b12bae. 5',
  '0 1db87a14. 6',
  '0 6abf4a82. 7',
  '0 fa005713. 8',
  '0 8d076785. 9',
  '0 a15d25e1. 10' ]
 var a1=  [ '1 83dcefb7. 1',
  '1 1ad5be0d. 2',
  '1 6dd28e9b. 3',
  '1 f3b61b38. 4',
  '1 84b12bae. 5',
  '1 1db87a14. 6',
  '1 6abf4a82. 7',
  '1 fa005713. 8',
  '1 8d076785. 9',
  '1 a15d25e1. 10' ]

 var receivestate={emitedh:[],emitedt:[],emitedd:[],emitedid:[],queues:{}}
 
 if(a0[0])console.log("0:",pushreturn(arr,dedupreceive(a0[0],receivestate)));
 if(a1[0])console.log("1:",pushreturn(arr,dedupreceive(a1[0],receivestate)) );
 
 if(a0[1])console.log("0:",pushreturn(arr,dedupreceive(a0[1],receivestate)));
 if(a1[1])console.log("1:",pushreturn(arr,dedupreceive(a1[1],receivestate)) );
 
 if(a0[2])console.log("0:",pushreturn(arr,dedupreceive(a0[2],receivestate)));
 if(a1[2])console.log("1:",pushreturn(arr,dedupreceive(a1[2],receivestate)) );
 
 if(a0[3])console.log("0:",pushreturn(arr,dedupreceive(a0[3],receivestate)));
 if(a1[3])console.log("1:",pushreturn(arr,dedupreceive(a1[3],receivestate)) );
 
 if(a0[4])console.log("0:",pushreturn(arr,dedupreceive(a0[4],receivestate)));
 //if(a1[4])console.log("1:",pushreturn(arr,dedupreceive(a1[4],receivestate)) );
 
 if(a0[5])console.log("0:",pushreturn(arr,dedupreceive(a0[5],receivestate)));
 //if(a1[5])console.log("1:",pushreturn(arr,dedupreceive(a1[5],receivestate)) );
 
 if(a0[6])console.log("0:",pushreturn(arr,dedupreceive(a0[6],receivestate)));
 //if(a1[6])console.log("1:",pushreturn(arr,dedupreceive(a1[6],receivestate)) );
 
 if(a0[7])console.log("0:",pushreturn(arr,dedupreceive(a0[7],receivestate)));
 //if(a1[7])console.log("1:",pushreturn(arr,dedupreceive(a1[7],receivestate)) );
 
 if(a0[8])console.log("0:",pushreturn(arr,dedupreceive(a0[8],receivestate)));
 //if(a1[8])console.log("1:",pushreturn(arr,dedupreceive(a1[8],receivestate)) );
 
 if(a0[9])console.log("0:",pushreturn(arr,dedupreceive(a0[9],receivestate)));
 //if(a1[9])console.log("1:",pushreturn(arr,dedupreceive(a1[9],receivestate)) );
  return arr;
}


function test3()
{
 var arr=[];
 var a0=  [ '0 83dcefb7. 1',
  '0 1ad5be0d. 2',
  '0 6dd28e9b. 3',
  '0 f3b61b38. 4',
  '0 84b12bae. 5',
  '0 1db87a14. 6',
  '0 6abf4a82. 7',
  '0 fa005713. 8',
  '0 8d076785. 9',
  '0 a15d25e1. 10' ]
 var a1=  [ '1 83dcefb7. 1',
  '1 1ad5be0d. 2',
  '1 6dd28e9b. 3',
  '1 f3b61b38. 4',
  '1 84b12bae. 5',
  '1 1db87a14. 6',
  '1 6abf4a82. 7',
  '1 fa005713. 8',
  '1 8d076785. 9',
  '1 a15d25e1. 10' ]

 var receivestate={emitedh:[],emitedt:[],emitedd:[],emitedid:[],queues:{}}
 
 if(a0[0])console.log("0:",pushreturn(arr,dedupreceive(a0[0],receivestate)));
 if(a1[0])console.log("1:",pushreturn(arr,dedupreceive(a1[0],receivestate)) );
 
 if(a0[1])console.log("0:",pushreturn(arr,dedupreceive(a0[1],receivestate)));
 if(a1[1])console.log("1:",pushreturn(arr,dedupreceive(a1[1],receivestate)) );
 
 if(a0[2])console.log("0:",pushreturn(arr,dedupreceive(a0[2],receivestate)));
 if(a1[2])console.log("1:",pushreturn(arr,dedupreceive(a1[2],receivestate)) );
 
 if(a0[3])console.log("0:",pushreturn(arr,dedupreceive(a0[3],receivestate)));
 //if(a1[3])console.log("1:",pushreturn(arr,dedupreceive(a1[3],receivestate)) );
 
 if(a0[4])console.log("0:",pushreturn(arr,dedupreceive(a0[4],receivestate)));
 //if(a1[4])console.log("1:",pushreturn(arr,dedupreceive(a1[4],receivestate)) );
 
 if(a0[5])console.log("0:",pushreturn(arr,dedupreceive(a0[5],receivestate)));
 //if(a1[5])console.log("1:",pushreturn(arr,dedupreceive(a1[5],receivestate)) );
 
 if(a0[6])console.log("0:",pushreturn(arr,dedupreceive(a0[6],receivestate)));
 //if(a1[6])console.log("1:",pushreturn(arr,dedupreceive(a1[6],receivestate)) );
 
 if(a0[7])console.log("0:",pushreturn(arr,dedupreceive(a0[7],receivestate)));
 if(a1[7])console.log("1:",pushreturn(arr,dedupreceive(a1[7],receivestate)) );
 
 if(a0[8])console.log("0:",pushreturn(arr,dedupreceive(a0[8],receivestate)));
 if(a1[8])console.log("1:",pushreturn(arr,dedupreceive(a1[8],receivestate)) );
 
 if(a0[9])console.log("0:",pushreturn(arr,dedupreceive(a0[9],receivestate)));
 if(a1[9])console.log("1:",pushreturn(arr,dedupreceive(a1[9],receivestate)) );
  return arr;
}


function test4()
{
 var arr=[];
 var a0=  ["0 83dcefb7. 1",
 "0 1ad5be0d. 2",
 "0 6dd28e9b. 3",
 "0 6dd28e9b. 4",//3 // same hashes but numbers changed for visibility
 "0 6dd28e9b. 5", //3
 "0 6dd28e9b. 6",//3
 "0 6dd28e9b. 7", //3
 "0 6dd28e9b. 8",//3
 "0 6dd28e9b. 9", //3
 "0 6dd28e9b. 10"] //3
 
 var a1=  ["1 83dcefb7. 1",
 "1 1ad5be0d. 2", 
 "1 6dd28e9b. 3", 
 "1 6dd28e9b. 4", //3
 "1 6dd28e9b. 5", //3
 "1 6dd28e9b. 6",//3
 "1 6dd28e9b. 7",//3
 "1 6dd28e9b. 8",//3
 "1 6dd28e9b. 9",//3
 "1 6dd28e9b. 10"] //3

 var receivestate={emitedh:[],emitedt:[],emitedd:[],emitedid:[],queues:{}}
 
 if(a0[0])console.log("0:",pushreturn(arr,dedupreceive(a0[0],receivestate)));
 if(a1[0])console.log("1:",pushreturn(arr,dedupreceive(a1[0],receivestate)) );
 
 if(a0[1])console.log("0:",pushreturn(arr,dedupreceive(a0[1],receivestate)));
 if(a1[1])console.log("1:",pushreturn(arr,dedupreceive(a1[1],receivestate)) );
 
 if(a0[2])console.log("0:",pushreturn(arr,dedupreceive(a0[2],receivestate)));
 if(a1[2])console.log("1:",pushreturn(arr,dedupreceive(a1[2],receivestate)) );
 
 if(a0[3])console.log("0:",pushreturn(arr,dedupreceive(a0[3],receivestate)));
 if(a1[3])console.log("1:",pushreturn(arr,dedupreceive(a1[3],receivestate)) );
 
 if(a0[4])console.log("0:",pushreturn(arr,dedupreceive(a0[4],receivestate)));
 if(a1[4])console.log("1:",pushreturn(arr,dedupreceive(a1[4],receivestate)) );
 
 if(a0[5])console.log("0:",pushreturn(arr,dedupreceive(a0[5],receivestate)));
 if(a1[5])console.log("1:",pushreturn(arr,dedupreceive(a1[5],receivestate)) );
 
 if(a0[6])console.log("0:",pushreturn(arr,dedupreceive(a0[6],receivestate)));
 if(a1[6])console.log("1:",pushreturn(arr,dedupreceive(a1[6],receivestate)) );
 
 if(a0[7])console.log("0:",pushreturn(arr,dedupreceive(a0[7],receivestate)));
 if(a1[7])console.log("1:",pushreturn(arr,dedupreceive(a1[7],receivestate)) );
 
 if(a0[8])console.log("0:",pushreturn(arr,dedupreceive(a0[8],receivestate)));
 if(a1[8])console.log("1:",pushreturn(arr,dedupreceive(a1[8],receivestate)) );
 
 if(a0[9])console.log("0:",pushreturn(arr,dedupreceive(a0[9],receivestate)));
 if(a1[9])console.log("1:",pushreturn(arr,dedupreceive(a1[9],receivestate)) );
  return arr;
}

//test7a// 1 starts ,2 joins, 1 leaves, (input of 1 was skipped by input) 1 sends lower numbers for future mesages  ## problem
//
//    option 1 validate time
//
//   frames of input between 4 5 6
//   
// 
//
//    order    1 2 3 4 5    6    7   8   9   10
//    time     1 2 3 4 5    6    7   8   9   10
//    value    1 2 3 4 5    6    7   8   9   10 
//
//    order    1 2 3 4 5    6   7   8   9
//    time     1 2 3 4 5.99 6.9 7.9 8.9 9.9 //sampling was on the tail of 5 so it got 6, means synching approch is might be wrong for this model., probably i should get back to search in history for the last position found per connection and search from there but this assumes per connection messages cant be out of order which is true but only if there are no repetitions in short time which might be true.
//    value    1 2 3 4 6    7   8   9   10
//    
//  thes solution is when two synchings are not working both are set to not synced state to sync from position of not synching
//
//
function test7a()// skip in one server forces a skip in all others and double emit in others
{
 var arr=[];
 var a0=[ '0 83dcefb7 1',
  '0 1ad5be0d 2',
  '0 6dd28e9b 3',
  '0 f3b61b38 4',
  '0 84b12bae 5',
  '0 1db87a14 6',
  '0 6abf4a82 7',
  '0 fa005713 8',
  '0 8d076785 9',
  '0 a15d25e1 10'  ] 
  
 var a1=  [ '1 83dcefb7 1',
  '1 1ad5be0d 2',
  '1 6dd28e9b 3',
  '1 f3b61b38 4',
  '1 84b12bae 5',
  '1 1db87a14 6',
  '1 6abf4a82 7',
  '1 fa005713 8',
  '1 8d076785 9',
  '1 a15d25e1 10' ]

 var receivestate={emitedh:[],emitedt:[],emitedd:[],emitedid:[],queues:{}}
 
 if(a0[0])console.log("0:",pushreturn(arr,dedupreceive(a0[0],receivestate)));
 if(a1[0])console.log("1:",pushreturn(arr,dedupreceive(a1[0],receivestate)) );
 
 if(a0[1])console.log("0:",pushreturn(arr,dedupreceive(a0[1],receivestate)));
 if(a1[1])console.log("1:",pushreturn(arr,dedupreceive(a1[1],receivestate)) );
 
 if(a0[2])console.log("0:",pushreturn(arr,dedupreceive(a0[2],receivestate)));
 if(a1[2])console.log("1:",pushreturn(arr,dedupreceive(a1[2],receivestate)) );
 
 //if(a0[3])console.log("0:",pushreturn(arr,dedupreceive(a0[3],receivestate)));
 if(a1[3])console.log("1:",pushreturn(arr,dedupreceive(a1[3],receivestate)) );
 
 if(a0[4])console.log("0:",pushreturn(arr,dedupreceive(a0[4],receivestate)));
 if(a1[4])console.log("1:",pushreturn(arr,dedupreceive(a1[4],receivestate)) );
 
 if(a0[5])console.log("0:",pushreturn(arr,dedupreceive(a0[5],receivestate)));
 if(a1[5])console.log("1:",pushreturn(arr,dedupreceive(a1[5],receivestate)) );
  return arr;
 //if(a0[6])console.log("0:",pushreturn(arr,dedupreceive(a0[6],receivestate)));
 if(a1[6])console.log("1:",pushreturn(arr,dedupreceive(a1[6],receivestate)) );
 
 //if(a0[7])console.log("0:",pushreturn(arr,dedupreceive(a0[7],receivestate)));
 if(a1[7])console.log("1:",pushreturn(arr,dedupreceive(a1[7],receivestate)) );
 
 //if(a0[8])console.log("0:",pushreturn(arr,dedupreceive(a0[8],receivestate)));
 if(a1[8])console.log("1:",pushreturn(arr,dedupreceive(a1[8],receivestate)) );
 
 //if(a0[9])console.log("0:",pushreturn(arr,dedupreceive(a0[9],receivestate)));
 //if(a1[9])console.log("1:",pushreturn(arr,dedupreceive(a1[9],receivestate)) );
}


function test7b() //for unknown reason works well
{
 var arr=[];
 var a1=[ '1 11 83dcefb7 1',
  '1 12 1ad5be0d 2',
  '1 13 6dd28e9b 3',
  '1 14 f3b61b38 4',
  '1 15 1db87a14 6',
  '1 16 6abf4a82 7',
  '1 17 fa005713 8',
  '1 18 8d076785 9',
  '1 19 a15d25e1 10',
  '1 20 fedc304f undefined' ] 
  
 var a0=  [ '0 1 83dcefb7 1',
  '0 2 1ad5be0d 2',
  '0 3 6dd28e9b 3',
  '0 4 f3b61b38 4',
  '0 5 84b12bae 5',
  '0 6 1db87a14 6',
  '0 7 6abf4a82 7',
  '0 8 fa005713 8',
  '0 9 8d076785 9',
  '0 10 a15d25e1 10' ]

 var receivestate={emitedh:[],emitedt:[],emitedd:[],emitedid:[],queues:{}}
 
 if(a0[0])console.log("0:",pushreturn(arr,dedupreceive(a0[0],receivestate)));
 if(a1[0])console.log("1:",pushreturn(arr,dedupreceive(a1[0],receivestate)) );
 
 if(a0[1])console.log("0:",pushreturn(arr,dedupreceive(a0[1],receivestate)));
 if(a1[1])console.log("1:",pushreturn(arr,dedupreceive(a1[1],receivestate)) );
 
 if(a0[2])console.log("0:",pushreturn(arr,dedupreceive(a0[2],receivestate)));
 if(a1[2])console.log("1:",pushreturn(arr,dedupreceive(a1[2],receivestate)) );
 
 if(a0[3])console.log("0:",pushreturn(arr,dedupreceive(a0[3],receivestate)));
 if(a1[3])console.log("1:",pushreturn(arr,dedupreceive(a1[3],receivestate)) );
 
 if(a0[4])console.log("0:",pushreturn(arr,dedupreceive(a0[4],receivestate)));
 if(a1[4])console.log("1:",pushreturn(arr,dedupreceive(a1[4],receivestate)) );
 
 if(a0[5])console.log("0:",pushreturn(arr,dedupreceive(a0[5],receivestate)));
 if(a1[5])console.log("1:",pushreturn(arr,dedupreceive(a1[5],receivestate)) );
 
 if(a0[6])console.log("0:",pushreturn(arr,dedupreceive(a0[6],receivestate)));
 if(a1[6])console.log("1:",pushreturn(arr,dedupreceive(a1[6],receivestate)) );
 
 if(a0[7])console.log("0:",pushreturn(arr,dedupreceive(a0[7],receivestate)));
 //if(a1[7])console.log("1:",pushreturn(arr,dedupreceive(a1[7],receivestate)) );
 
 if(a0[8])console.log("0:",pushreturn(arr,dedupreceive(a0[8],receivestate)));
 //if(a1[8])console.log("1:",pushreturn(arr,dedupreceive(a1[8],receivestate)) );
 
 //if(a0[9])console.log("0:",pushreturn(arr,dedupreceive(a0[9],receivestate)));
 //if(a1[9])console.log("1:",pushreturn(arr,dedupreceive(a1[9],receivestate)) );
  return arr;
}

// the solution as in test 7a but also to delay until synching is done.

function test8a()// one wrong takes over the other wrong
{
 var arr=[];
 var a1=  [ '0 83dcefb7 1',
  '0 1ad5be0d 2',
  '0 6dd28e9b 3',
  '0 f3b61b38 4',
  '0 84b12bae 5',
  '0 1db87a14 6',
  '0 6abf4a82 7',
  '0 fa005713 8',
  '0 8d076785 9',
  '0 a15d25e1 10' ]

  
 var a0= [ '1 83dcefb7 1',
  '1 1ad5be0d 2',
  '1 6dd28e9b 3',
  '1 f3b61b38 4',
  '1 d137d16e 15',
  '1 483e80d4 16',
  '1 3f39b042 17',
  '1 af86add3 18',
  '1 d8819d45 19',
  '1 3a6c61ab 110' ]


 var receivestate={emitedh:[],emitedt:[],emitedd:[],emitedid:[],queues:{}}
 
 if(a0[0])console.log("0:",pushreturn(arr,dedupreceive(a0[0],receivestate)));
 if(a1[0])console.log("1:",pushreturn(arr,dedupreceive(a1[0],receivestate)) );
 
 if(a0[1])console.log("0:",pushreturn(arr,dedupreceive(a0[1],receivestate)));
 if(a1[1])console.log("1:",pushreturn(arr,dedupreceive(a1[1],receivestate)) );
 
 if(a0[2])console.log("0:",pushreturn(arr,dedupreceive(a0[2],receivestate)));
 if(a1[2])console.log("1:",pushreturn(arr,dedupreceive(a1[2],receivestate)) );
 
 if(a0[3])console.log("0:",pushreturn(arr,dedupreceive(a0[3],receivestate)));
 if(a1[3])console.log("1:",pushreturn(arr,dedupreceive(a1[3],receivestate)) );
 
 if(a0[4])console.log("0:",pushreturn(arr,dedupreceive(a0[4],receivestate)));
 if(a1[4])console.log("1:",pushreturn(arr,dedupreceive(a1[4],receivestate)) );
 
 if(a0[5])console.log("0:",pushreturn(arr,dedupreceive(a0[5],receivestate)));
 if(a1[5])console.log("1:",pushreturn(arr,dedupreceive(a1[5],receivestate)) );
 
 if(a0[6])console.log("0:",pushreturn(arr,dedupreceive(a0[6],receivestate)));
 if(a1[6])console.log("1:",pushreturn(arr,dedupreceive(a1[6],receivestate)) );
 
 //if(a0[7])console.log("0:",pushreturn(arr,dedupreceive(a0[7],receivestate)));
 if(a1[7])console.log("1:",pushreturn(arr,dedupreceive(a1[7],receivestate)) );
 
 //if(a0[8])console.log("0:",pushreturn(arr,dedupreceive(a0[8],receivestate)));
 if(a1[8])console.log("1:",pushreturn(arr,dedupreceive(a1[8],receivestate)) );
 
// if(a0[9])console.log("0:",pushreturn(arr,dedupreceive(a0[9],receivestate)));
 if(a1[9])console.log("1:",pushreturn(arr,dedupreceive(a1[9],receivestate)) );
  return arr;
}



function test8b()
{
 var arr=[];
 var a0=  [ '0 83dcefb7 1',
  '0 1ad5be0d 2',
  '0 6dd28e9b 3',
  '0 f3b61b38 4',
  '0 84b12bae 5',
  '0 1db87a14 6',
  '0 6abf4a82 7',
  '0 fa005713 8',
  '0 8d076785 9',
  '0 a15d25e1 10' ]

  
 var a1= [ '1 83dcefb7 1',
  '1 1ad5be0d 2',
  '1 6dd28e9b 3',
  '1 f3b61b38 4',
  '1 d137d16e 15',
  '1 483e80d4 16',
  '1 3f39b042 17', // not sent
  '1 af86add3 18', // not sent
  '1 d8819d45 19', // not sent
  '1 3a6c61ab 110' ] // not sent


 var receivestate={emitedh:[],emitedt:[],emitedd:[],emitedid:[],queues:{}}
 
 if(a0[0])console.log("0:",pushreturn(arr,dedupreceive(a0[0],receivestate)));
 if(a1[0])console.log("1:",pushreturn(arr,dedupreceive(a1[0],receivestate)) );
 
 if(a0[1])console.log("0:",pushreturn(arr,dedupreceive(a0[1],receivestate)));
 if(a1[1])console.log("1:",pushreturn(arr,dedupreceive(a1[1],receivestate)) );
 
 if(a0[2])console.log("0:",pushreturn(arr,dedupreceive(a0[2],receivestate)));
 if(a1[2])console.log("1:",pushreturn(arr,dedupreceive(a1[2],receivestate)) );
 
 if(a0[3])console.log("0:",pushreturn(arr,dedupreceive(a0[3],receivestate)));
 if(a1[3])console.log("1:",pushreturn(arr,dedupreceive(a1[3],receivestate)) );
 
 if(a0[4])console.log("0:",pushreturn(arr,dedupreceive(a0[4],receivestate)));
 if(a1[4])console.log("1:",pushreturn(arr,dedupreceive(a1[4],receivestate)) );
 
 if(a0[5])console.log("0:",pushreturn(arr,dedupreceive(a0[5],receivestate)));
 if(a1[5])console.log("1:",pushreturn(arr,dedupreceive(a1[5],receivestate)) );
 
 if(a0[6])console.log("0:",pushreturn(arr,dedupreceive(a0[6],receivestate)));
 //if(a1[6])console.log("1:",pushreturn(arr,dedupreceive(a1[6],receivestate)) );
 
 if(a0[7])console.log("0:",pushreturn(arr,dedupreceive(a0[7],receivestate)));
 //if(a1[7])console.log("1:",pushreturn(arr,dedupreceive(a1[7],receivestate)) );
 
 if(a0[8])console.log("0:",pushreturn(arr,dedupreceive(a0[8],receivestate)));
 //if(a1[8])console.log("1:",pushreturn(arr,dedupreceive(a1[8],receivestate)) );
 
 if(a0[9])console.log("0:",pushreturn(arr,dedupreceive(a0[9],receivestate)));
 //if(a1[9])console.log("1:",pushreturn(arr,dedupreceive(a1[9],receivestate)) );
 console.log(arr);
 return arr;
}


//test2();
