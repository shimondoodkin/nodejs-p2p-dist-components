// this trail but abandounded dedup receive version might work only if there are no skipps or frame slipps like snappshot at end or two snapshots on same frame but different numbers,
// or possible to change to code of this to use exect ids
// test 7 and 8 fail because of the design
//
//xxhashjs replcement tomake it a single module with no dependencies for testing
var makeCRCTable=function(){for(var r,a=[],e=0;256>e;e++){r=e;for(var n=0;8>n;n++)r=1&r?3988292384^r>>>1:r>>>1;a[e]=r}return a}(), crc32=function(r){for(var a=makeCRCTable,e=-1,n=0;n<r.length;n++)e=e>>>8^a[255&(e^r.charCodeAt(n))];return(-1^e)>>>0},XXH=crc32;
//var XXH=require('xxhashjs');
if(!((function(){return this})()).zmqdedupprint)zmqdedupprint=true;
dedupsend=function(data,state,clientid,hashdata)// var sendstate= {count_send:0}
{
 if(zmqdedupprint) if(data==='undefined')console.log("dedupsend sending data undefined");
 if(zmqdedupprint) if(hashdata==='undefined')console.log("dedupsend sending hashdata undefined");
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
 //if(state.prev_send==hashstring) state.count_send++; else  state.count_send=0;
 state.count_send++;
 var h = XXH( hashstring , 0xABCD ).toString(16);
 //state.prev_send=hashstring;
 //state.prevhashes.push(hashstring);// not needed actually
 
 //if(state.prevhashes.length>500)
//  state.prevhashes.splice(0,state.prevhashes.length-250);
  
 return clientid+' '+state.count_send+' '+h+' '+d;
}
//example:
//var sendstate1= {count_send:0}
//var clientid1=1
//zmqsocket.send(dedupsend(object,sendstate1,clientid1));

function searchbacknitems(items,array)
{
 if(array.length<items.length) return false //not found
 var found=false;
 var i=array.length-items.length;
 for(;i>=0;i--)
 {
  found=true
  for(var l=items.length-1,n=l;n>=0;n--)
  {
   //console.log(n,i-l+n,items[n],array[i-l+n])
   if(items[n]!=array[i+n]) // can skip undefineds on one side but than at last 50% of matches should match and be not undefined
   {
    found=false;
    break;
   }
  }
  if(found) break;
 }
 var found1=found;
 var found1i=i;
 if(!found1) return false;
 i--;
 if(found1) // if found search more for duplicate
 {
 var found=false;
 for(;i>=0;i--)
 {
  found=true
  for(var l=items.length-1,n=l;n>=0;n--)
  {
   ///console.log(n,i-l+n,items[n],array[i-l+n])
   if(items[n]!=array[i+n])
   {
    found=false;
    break;
   }
  }
  if(found) break;
 }
 var found2=found;
 }
 if(found1&&found2) return null;
 if(found1&&!found2) return found1i;
}

dedupreceive=function (str,state) { //var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
   var r=str.split(' ',3);r[3]=str.substring(r[0].length+1+r[1].length+1+r[2].length+1, str.length);
   //console.log("r:",r);
   var client=r[0],n=r[1],hash=r[2],data=r[3];
   //add to queue
   var qid=state.queueid[client];
   if(qid===undefined)
   {
    qid=state.queues.push({synced:false,hh:[],hn:[],ht:[],off:0})-1;
    state.queueid[client]=qid;
    if(state.queues.length==1)
    {
	 console.log('clientid '+client+' new and first')
     state.lastqueueinsync=state.queues[qid];//if i am first queue set me as last synced queue
     var q=state.queues[qid];
     q.synced=0
    }
	else
	 console.log('clientid '+client+' new')
   }
   var q=state.queues[qid];
   var hh=q.hh;
   var hn=q.hn;
   var ht=q.ht;
   if(hn.length==0)
   {
    var hni=-1;
    var d=1;
   }
   else
   {
    var hni=hn.length-1;//distance from last item if last item is 6 and araives 7 then is is 1, 1 adds to last position it array to put there the araived data
    var d=n-hn[hni];
    if(d==0) //should not happen the last n is samae as previous n, only if two clients have same id or client resends pos-1 old data
	{
	 if(hh[hni+d]==hash)
	 {
	  console.log('client resends old data ',client,hash,data);
	  return undefined; 
	 }
	 else
	 {
	  console.log('client resends different old data ',client,hash,data);
	  //resync
	  hni=-1;
      d=1;
      hh.splice(0,hh.length);
      hn.splice(0,hn.length);
      ht.splice(0,ht.length);
      q.synced=false;
	 }
	}
    if(d<0) // if the n is less than the last n -- there was a restart i the sender id probably should not happen ether because then there will be a new clientid
    {
	 //resync
     hni=-1;
     d=1;
     hh.splice(0,hh.length);
     hn.splice(0,hn.length);
     ht.splice(0,ht.length);
     q.synced=false;
    }
   }
   
   hh[hni+d]=hash
   hn[hni+d]=n;
   ht[hni+d]=new Date().getTime();
   if(q.synced===false)
   {
    for(var nitems=1;nitems<hh.length;nitems++)
    {
        var result=searchbacknitems(hh.slice(hh.length-nitems),state.lastqueueinsync.hh);
        if(result===null)
        {
         continue; // try larger size
        }
        else if(result===false)
        {
          //not found yet try later,
          break;
        }
        else
        {
		  console.log('clientid '+client+' synched')
          // done
          q.synced=(hn[hni+d]-state.lastqueueinsync.hn[result])+(state.lastqueueinsync.synced===false?0:state.lastqueueinsync.synced);
          break;
        }
    }
   }

   var t=new Date().getTime();
   if(t-ht[hni+d]>120000)
   {
     var i;
     for(i=0;i<ht.length&&t-ht[i]>60000;i++){}
     if(zmqdedupprint) console.log('cleanup array remove '+i+' from '+ht.length)
       ht.splice(0,i);
     hh.splice(0,i);
     hn.splice(0,i);
     //if(hh.length==0)q.synced===false// hsould i do it?
   }
   if(q.synced!==false)
   {
    //if(zmqdedupprint) console.log(client,': n-q.synced',n,-q.synced,'=',n-q.synced);
    if(n-q.synced>state.lastemitedn) // is new ?
    {
     state.lastqueueinsync=q;
     if(zmqdedupprint) if(data==='undefined')console.log("dedupreceive got undefined");
     if(zmqdedupprint) console.log("dedupreceive good ",client,hash,data,"#");
     state.lastemitedn=n-q.synced;
     return data==='undefined'?undefined:JSON.parse(data);
    }
    else
    {
     if(zmqdedupprint) console.log('dedupreceive dup ',client,hash,data,"-");
     return undefined;
    }
   }
}

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
var sendstate0= {count_send:0},sendstate1= {count_send:0}
var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
var a0=[1,2,3,4,5,6,7,8,9,10], a1=[1,2,3,4,15,16,17,18,19,110]
var a=[];
for(var i=0;i<10;i++)
 a.push(dedupsend(a0.shift(),sendstate0,0))
 console.log("got0:",a);

var a=[];
for(var i=0;i<10;i++)
 a.push(dedupsend(a1.shift(),sendstate0,1))
 console.log("got1:",a);

 //console.log("got:",dedupreceive(dedupsend(a0.pop(),sendstate0,0),receivestate),dedupreceive(dedupsend(a1.pop(),sendstate1,1),receivestate) );
}


function test1()
{
 var a0= [ '0 1 83dcefb7 1',
  '0 2 1ad5be0d 2',
  '0 3 6dd28e9b 3',
  '0 4 f3b61b38 4',
  '0 5 84b12bae 5',
  '0 6 1db87a14 6',
  '0 7 6abf4a82 7',
  '0 8 fa005713 8',
  '0 9 8d076785 9',
  '0 10 a15d25e1 10' ]
  
 var a1= [ '1 11 83dcefb7 1',
  '1 12 1ad5be0d 2',
  '1 13 6dd28e9b 3',
  '1 14 f3b61b38 4',
  '1 15 84b12bae 5',
  '1 16 1db87a14 6',
  '1 17 6abf4a82 7',
  '1 18 fa005713 8',
  '1 19 8d076785 9',
  '1 20 a15d25e1 10' ]

 var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
 
 if(a0[0])console.log("0:",dedupreceive(a0[0],receivestate));
 if(a1[0])console.log("1:",dedupreceive(a1[0],receivestate) );
 
 if(a0[1])console.log("0:",dedupreceive(a0[1],receivestate));
 if(a1[1])console.log("1:",dedupreceive(a1[1],receivestate) );
 
 if(a0[2])console.log("0:",dedupreceive(a0[2],receivestate));
 if(a1[2])console.log("1:",dedupreceive(a1[2],receivestate) );
 
 if(a0[3])console.log("0:",dedupreceive(a0[3],receivestate));
 if(a1[3])console.log("1:",dedupreceive(a1[3],receivestate) );
 
 if(a0[4])console.log("0:",dedupreceive(a0[4],receivestate));
 if(a1[4])console.log("1:",dedupreceive(a1[4],receivestate) );
 
 if(a0[5])console.log("0:",dedupreceive(a0[5],receivestate));
 if(a1[5])console.log("1:",dedupreceive(a1[5],receivestate) );
 
 if(a0[6])console.log("0:",dedupreceive(a0[6],receivestate));
 if(a1[6])console.log("1:",dedupreceive(a1[6],receivestate) );
 
 if(a0[7])console.log("0:",dedupreceive(a0[7],receivestate));
 if(a1[7])console.log("1:",dedupreceive(a1[7],receivestate) );
 
 if(a0[8])console.log("0:",dedupreceive(a0[8],receivestate));
 if(a1[8])console.log("1:",dedupreceive(a1[8],receivestate) );
 
 if(a0[9])console.log("0:",dedupreceive(a0[9],receivestate));
 if(a1[9])console.log("1:",dedupreceive(a1[9],receivestate) );
}

function test2()
{
 var a0= [ '0 1 83dcefb7 1',
  '0 2 1ad5be0d 2',
  '0 3 6dd28e9b 3',
  '0 4 f3b61b38 4',
  '0 5 84b12bae 5',
  '0 6 1db87a14 6',
  '0 7 6abf4a82 7',
  '0 8 fa005713 8',
  '0 9 8d076785 9',
  '0 10 a15d25e1 10' ]
  
 var a1= [ '1 11 83dcefb7 1',
  '1 12 1ad5be0d 2',
  '1 13 6dd28e9b 3',
  '1 14 f3b61b38 4',
  '1 15 84b12bae 5',
  '1 16 1db87a14 6',
  '1 17 6abf4a82 7',
  '1 18 fa005713 8',
  '1 19 8d076785 9',
  '1 20 a15d25e1 10' ]

 var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
 
 if(a0[0])console.log("0:",dedupreceive(a0[0],receivestate));
 if(a1[0])console.log("1:",dedupreceive(a1[0],receivestate) );
 
 if(a0[1])console.log("0:",dedupreceive(a0[1],receivestate));
 if(a1[1])console.log("1:",dedupreceive(a1[1],receivestate) );
 
 if(a0[2])console.log("0:",dedupreceive(a0[2],receivestate));
 if(a1[2])console.log("1:",dedupreceive(a1[2],receivestate) );
 
 if(a0[3])console.log("0:",dedupreceive(a0[3],receivestate));
 if(a1[3])console.log("1:",dedupreceive(a1[3],receivestate) );
 
 if(a0[4])console.log("0:",dedupreceive(a0[4],receivestate));
 //if(a1[4])console.log("1:",dedupreceive(a1[4],receivestate) );
 
 if(a0[5])console.log("0:",dedupreceive(a0[5],receivestate));
 //if(a1[5])console.log("1:",dedupreceive(a1[5],receivestate) );
 
 if(a0[6])console.log("0:",dedupreceive(a0[6],receivestate));
 //if(a1[6])console.log("1:",dedupreceive(a1[6],receivestate) );
 
 if(a0[7])console.log("0:",dedupreceive(a0[7],receivestate));
 //if(a1[7])console.log("1:",dedupreceive(a1[7],receivestate) );
 
 if(a0[8])console.log("0:",dedupreceive(a0[8],receivestate));
 //if(a1[8])console.log("1:",dedupreceive(a1[8],receivestate) );
 
 if(a0[9])console.log("0:",dedupreceive(a0[9],receivestate));
 //if(a1[9])console.log("1:",dedupreceive(a1[9],receivestate) );
}


function test3()
{
 var a0= [ '0 1 83dcefb7 1',
  '0 2 1ad5be0d 2',
  '0 3 6dd28e9b 3',
  '0 4 f3b61b38 4',
  '0 5 84b12bae 5',
  '0 6 1db87a14 6',
  '0 7 6abf4a82 7',
  '0 8 fa005713 8',
  '0 9 8d076785 9',
  '0 10 a15d25e1 10' ]
  
 var a1= [ '1 11 83dcefb7 1',
  '1 12 1ad5be0d 2',
  '1 13 6dd28e9b 3',
  '1 14 f3b61b38 4',
  '1 15 84b12bae 5',
  '1 16 1db87a14 6',
  '1 17 6abf4a82 7',
  '1 18 fa005713 8',
  '1 19 8d076785 9',
  '1 20 a15d25e1 10' ]

 var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
 
 if(a0[0])console.log("0:",dedupreceive(a0[0],receivestate));
 if(a1[0])console.log("1:",dedupreceive(a1[0],receivestate) );
 
 if(a0[1])console.log("0:",dedupreceive(a0[1],receivestate));
 if(a1[1])console.log("1:",dedupreceive(a1[1],receivestate) );
 
 if(a0[2])console.log("0:",dedupreceive(a0[2],receivestate));
 if(a1[2])console.log("1:",dedupreceive(a1[2],receivestate) );
 
 if(a0[3])console.log("0:",dedupreceive(a0[3],receivestate));
 //if(a1[3])console.log("1:",dedupreceive(a1[3],receivestate) );
 
 if(a0[4])console.log("0:",dedupreceive(a0[4],receivestate));
 //if(a1[4])console.log("1:",dedupreceive(a1[4],receivestate) );
 
 if(a0[5])console.log("0:",dedupreceive(a0[5],receivestate));
 //if(a1[5])console.log("1:",dedupreceive(a1[5],receivestate) );
 
 if(a0[6])console.log("0:",dedupreceive(a0[6],receivestate));
 //if(a1[6])console.log("1:",dedupreceive(a1[6],receivestate) );
 
 if(a0[7])console.log("0:",dedupreceive(a0[7],receivestate));
 if(a1[7])console.log("1:",dedupreceive(a1[7],receivestate) );
 
 if(a0[8])console.log("0:",dedupreceive(a0[8],receivestate));
 if(a1[8])console.log("1:",dedupreceive(a1[8],receivestate) );
 
 if(a0[9])console.log("0:",dedupreceive(a0[9],receivestate));
 if(a1[9])console.log("1:",dedupreceive(a1[9],receivestate) );
}


function test4()
{
 var a0= [ '0 1 83dcefb7 1',
  '0 2 1ad5be0d 2',
  '0 3 6dd28e9b 3',
  '0 4 f3b61b38 4',
  '0 5 84b12bae 5',
  '0 6 1db87a14 6',
  '0 7 6abf4a82 7',
  '0 8 fa005713 8',
  '0 9 8d076785 9',
  '0 10 a15d25e1 10' ]
  
 var a1= [ '1 11 83dcefb7 1',
  '1 12 1ad5be0d 2',
  '1 13 6dd28e9b 3',
  '1 14 f3b61b38 4',
  '1 15 84b12bae 5',
  '1 1 1db87a14 6',
  '1 2 6abf4a82 7',
  '1 3 fa005713 8',
  '1 4 8d076785 9',
  '1 5 a15d25e1 10' ]

 var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
 
 if(a0[0])console.log("0:",dedupreceive(a0[0],receivestate));
 if(a1[0])console.log("1:",dedupreceive(a1[0],receivestate) );
 
 if(a0[1])console.log("0:",dedupreceive(a0[1],receivestate));
 if(a1[1])console.log("1:",dedupreceive(a1[1],receivestate) );
 
 if(a0[2])console.log("0:",dedupreceive(a0[2],receivestate));
 if(a1[2])console.log("1:",dedupreceive(a1[2],receivestate) );
 
 if(a0[3])console.log("0:",dedupreceive(a0[3],receivestate));
 if(a1[3])console.log("1:",dedupreceive(a1[3],receivestate) );
 
 if(a0[4])console.log("0:",dedupreceive(a0[4],receivestate));
 if(a1[4])console.log("1:",dedupreceive(a1[4],receivestate) );
 
 if(a0[5])console.log("0:",dedupreceive(a0[5],receivestate));
 if(a1[5])console.log("1:",dedupreceive(a1[5],receivestate) );
 
 if(a0[6])console.log("0:",dedupreceive(a0[6],receivestate));
 if(a1[6])console.log("1:",dedupreceive(a1[6],receivestate) );
 
 if(a0[7])console.log("0:",dedupreceive(a0[7],receivestate));
 if(a1[7])console.log("1:",dedupreceive(a1[7],receivestate) );
 
 if(a0[8])console.log("0:",dedupreceive(a0[8],receivestate));
 if(a1[8])console.log("1:",dedupreceive(a1[8],receivestate) );
 
 if(a0[9])console.log("0:",dedupreceive(a0[9],receivestate));
 if(a1[9])console.log("1:",dedupreceive(a1[9],receivestate) );
}



function test5()
{
 var a0= [ '0 1 83dcefb7 1',
  '0 2 1ad5be0d 2',
  '0 3 6dd28e9b 3',
  '0 4 f3b61b38 4',
  '0 5 84b12bae 5',
  '0 6 1db87a14 6',
  '0 7 6abf4a82 7',
  '0 8 fa005713 8',
  '0 9 8d076785 9',
  '0 10 a15d25e1 10' ]
  
 var a1= [ '1 11 83dcefb7 1',
  '1 12 1ad5be0d 2',
  '1 13 6dd28e9b 3',
  '1 14 f3b61b38 4',
  '1 15 84b12bae 5',
  '1 16 1db87a14 6',
  '1 17 6abf4a82 7',
  '1 18 fa005713 8',
  '1 19 8d076785 9',
  '1 20 a15d25e1 10' ]

 var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
 
 if(a0[0])console.log("0:",dedupreceive(a0[0],receivestate));
 if(a1[0])console.log("1:",dedupreceive(a1[0],receivestate) );
 
 if(a0[1])console.log("0:",dedupreceive(a0[1],receivestate));
 if(a1[1])console.log("1:",dedupreceive(a1[1],receivestate) );
 
 if(a0[2])console.log("0:",dedupreceive(a0[2],receivestate));
 if(a1[2])console.log("1:",dedupreceive(a1[2],receivestate) );
 
 if(a0[3])console.log("0:",dedupreceive(a0[3],receivestate));
 if(a1[3])console.log("1:",dedupreceive(a1[3],receivestate) );
 
 if(a0[4])console.log("0:",dedupreceive(a0[4],receivestate));
 if(a1[4])console.log("1:",dedupreceive(a1[4],receivestate) );
 
 if(a0[5])console.log("0:",dedupreceive(a0[5],receivestate));
 if(a1[5])console.log("1:",dedupreceive(a1[5],receivestate) );
 
 if(a0[6])console.log("0:",dedupreceive(a0[6],receivestate));
 if(a1[6])console.log("1:",dedupreceive(a1[6],receivestate) );
 if(a1[6])console.log("1:",dedupreceive(a1[6],receivestate) );
 
 if(a0[7])console.log("0:",dedupreceive(a0[7],receivestate));
 if(a1[7])console.log("1:",dedupreceive(a1[7],receivestate) );
 if(a1[7])console.log("1:",dedupreceive(a1[7],receivestate) );
 
 if(a0[8])console.log("0:",dedupreceive(a0[8],receivestate));
 if(a1[8])console.log("1:",dedupreceive(a1[8],receivestate) );
 if(a1[8])console.log("1:",dedupreceive(a1[8],receivestate) );
 
 if(a0[9])console.log("0:",dedupreceive(a0[9],receivestate));
 if(a1[9])console.log("1:",dedupreceive(a1[9],receivestate) );
}


function test6()
{
 var a0= [ '0 1 83dcefb7 1',
  '0 2 1ad5be0d 2',
  '0 3 6dd28e9b 3',
  '0 4 f3b61b38 4',
  '0 5 84b12bae 5',
  '0 6 1db87a14 6',
  '0 7 6abf4a82 7',
  '0 8 fa005713 8',
  '0 9 8d076785 9',
  '0 10 a15d25e1 10' ]
  
 var a1= [ '1 11 83dcefb7 1',
  '1 12 1ad5be0d 2',
  '1 13 6dd28e9b 3',
  '1 14 f3b61b38 4',
  '1 15 84b12bae 5',
  '1 16 1db87a14 6',
  '1 17 6abf4a82 7',
  '1 18 fa005713 8',
  '1 19 8d076785 9',
  '1 20 a15d25e1 10' ]

 var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
 
 if(a0[0])console.log("0:",dedupreceive(a0[0],receivestate));
 if(a1[0])console.log("1:",dedupreceive(a1[0],receivestate) );
 
 if(a0[1])console.log("0:",dedupreceive(a0[1],receivestate));
 if(a1[1])console.log("1:",dedupreceive(a1[1],receivestate) );
 
 if(a0[2])console.log("0:",dedupreceive(a0[2],receivestate));
 if(a1[2])console.log("1:",dedupreceive(a1[2],receivestate) );
 
 if(a0[3])console.log("0:",dedupreceive(a0[3],receivestate));
 if(a1[3])console.log("1:",dedupreceive(a1[3],receivestate) );
 
 if(a0[4])console.log("0:",dedupreceive(a0[4],receivestate));
 
 
 if(a0[5])console.log("0:",dedupreceive(a0[5],receivestate));
 
 
 if(a0[6])console.log("0:",dedupreceive(a0[6],receivestate));
 
 //late resend
 if(a1[4])console.log("1:",dedupreceive(a1[4],receivestate) );
 if(a1[5])console.log("1:",dedupreceive(a1[5],receivestate) );
 if(a1[6])console.log("1:",dedupreceive(a1[6],receivestate) );
 if(a1[7])console.log("1:",dedupreceive(a1[7],receivestate) );
 
 
 if(a0[7])console.log("0:",dedupreceive(a0[7],receivestate));
 
 
 if(a0[8])console.log("0:",dedupreceive(a0[8],receivestate));
 if(a1[8])console.log("1:",dedupreceive(a1[8],receivestate) );
 
 if(a0[9])console.log("0:",dedupreceive(a0[9],receivestate));
 if(a1[9])console.log("1:",dedupreceive(a1[9],receivestate) );
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
 var a0=[ '1 11 83dcefb7 1',
  '1 12 1ad5be0d 2',
  '1 13 6dd28e9b 3',
  '1 14 f3b61b38 4',
  '1 15 1db87a14 6',
  '1 16 6abf4a82 7',
  '1 17 fa005713 8',
  '1 18 8d076785 9',
  '1 19 a15d25e1 10',
  '1 20 fedc304f undefined' ] 
  
 var a1=  [ '0 1 83dcefb7 1',
  '0 2 1ad5be0d 2',
  '0 3 6dd28e9b 3',
  '0 4 f3b61b38 4',
  '0 5 84b12bae 5',
  '0 6 1db87a14 6',
  '0 7 6abf4a82 7',
  '0 8 fa005713 8',
  '0 9 8d076785 9',
  '0 10 a15d25e1 10' ]

 var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
 
 if(a0[0])console.log("0:",dedupreceive(a0[0],receivestate));
 if(a1[0])console.log("1:",dedupreceive(a1[0],receivestate) );
 
 if(a0[1])console.log("0:",dedupreceive(a0[1],receivestate));
 if(a1[1])console.log("1:",dedupreceive(a1[1],receivestate) );
 
 if(a0[2])console.log("0:",dedupreceive(a0[2],receivestate));
 if(a1[2])console.log("1:",dedupreceive(a1[2],receivestate) );
 
 if(a0[3])console.log("0:",dedupreceive(a0[3],receivestate));
 if(a1[3])console.log("1:",dedupreceive(a1[3],receivestate) );
 
 if(a0[4])console.log("0:",dedupreceive(a0[4],receivestate));
 if(a1[4])console.log("1:",dedupreceive(a1[4],receivestate) );
 
 if(a0[5])console.log("0:",dedupreceive(a0[5],receivestate));
 if(a1[5])console.log("1:",dedupreceive(a1[5],receivestate) );
 
 //if(a0[6])console.log("0:",dedupreceive(a0[6],receivestate));
 if(a1[6])console.log("1:",dedupreceive(a1[6],receivestate) );
 
 //if(a0[7])console.log("0:",dedupreceive(a0[7],receivestate));
 if(a1[7])console.log("1:",dedupreceive(a1[7],receivestate) );
 
 //if(a0[8])console.log("0:",dedupreceive(a0[8],receivestate));
 if(a1[8])console.log("1:",dedupreceive(a1[8],receivestate) );
 
 //if(a0[9])console.log("0:",dedupreceive(a0[9],receivestate));
 //if(a1[9])console.log("1:",dedupreceive(a1[9],receivestate) );
}


function test7b() //for unknown reason works well
{
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

 var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
 
 if(a0[0])console.log("0:",dedupreceive(a0[0],receivestate));
 if(a1[0])console.log("1:",dedupreceive(a1[0],receivestate) );
 
 if(a0[1])console.log("0:",dedupreceive(a0[1],receivestate));
 if(a1[1])console.log("1:",dedupreceive(a1[1],receivestate) );
 
 if(a0[2])console.log("0:",dedupreceive(a0[2],receivestate));
 if(a1[2])console.log("1:",dedupreceive(a1[2],receivestate) );
 
 if(a0[3])console.log("0:",dedupreceive(a0[3],receivestate));
 if(a1[3])console.log("1:",dedupreceive(a1[3],receivestate) );
 
 if(a0[4])console.log("0:",dedupreceive(a0[4],receivestate));
 if(a1[4])console.log("1:",dedupreceive(a1[4],receivestate) );
 
 if(a0[5])console.log("0:",dedupreceive(a0[5],receivestate));
 if(a1[5])console.log("1:",dedupreceive(a1[5],receivestate) );
 
 if(a0[6])console.log("0:",dedupreceive(a0[6],receivestate));
 if(a1[6])console.log("1:",dedupreceive(a1[6],receivestate) );
 
 if(a0[7])console.log("0:",dedupreceive(a0[7],receivestate));
 //if(a1[7])console.log("1:",dedupreceive(a1[7],receivestate) );
 
 if(a0[8])console.log("0:",dedupreceive(a0[8],receivestate));
 //if(a1[8])console.log("1:",dedupreceive(a1[8],receivestate) );
 
 //if(a0[9])console.log("0:",dedupreceive(a0[9],receivestate));
 //if(a1[9])console.log("1:",dedupreceive(a1[9],receivestate) );
}

// the solution as in test 7a but also to delay until synching is done.

function test8a()// one wrong takes over the other wrong
{
 var a1=  [ '0 1 83dcefb7 1',
  '0 2 1ad5be0d 2',
  '0 3 6dd28e9b 3',
  '0 4 f3b61b38 4',
  '0 5 84b12bae 5',
  '0 6 1db87a14 6',
  '0 7 6abf4a82 7',
  '0 8 fa005713 8',
  '0 9 8d076785 9',
  '0 10 a15d25e1 10' ]

  
 var a0= [ '1 11 83dcefb7 1',
  '1 12 1ad5be0d 2',
  '1 13 6dd28e9b 3',
  '1 14 f3b61b38 4',
  '1 15 d137d16e 15',
  '1 16 483e80d4 16',
  '1 17 3f39b042 17',
  '1 18 af86add3 18',
  '1 19 d8819d45 19',
  '1 20 3a6c61ab 110' ]


 var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
 
 if(a0[0])console.log("0:",dedupreceive(a0[0],receivestate));
 if(a1[0])console.log("1:",dedupreceive(a1[0],receivestate) );
 
 if(a0[1])console.log("0:",dedupreceive(a0[1],receivestate));
 if(a1[1])console.log("1:",dedupreceive(a1[1],receivestate) );
 
 if(a0[2])console.log("0:",dedupreceive(a0[2],receivestate));
 if(a1[2])console.log("1:",dedupreceive(a1[2],receivestate) );
 
 if(a0[3])console.log("0:",dedupreceive(a0[3],receivestate));
 if(a1[3])console.log("1:",dedupreceive(a1[3],receivestate) );
 
 if(a0[4])console.log("0:",dedupreceive(a0[4],receivestate));
 if(a1[4])console.log("1:",dedupreceive(a1[4],receivestate) );
 
 if(a0[5])console.log("0:",dedupreceive(a0[5],receivestate));
 if(a1[5])console.log("1:",dedupreceive(a1[5],receivestate) );
 
 if(a0[6])console.log("0:",dedupreceive(a0[6],receivestate));
 if(a1[6])console.log("1:",dedupreceive(a1[6],receivestate) );
 
 //if(a0[7])console.log("0:",dedupreceive(a0[7],receivestate));
 if(a1[7])console.log("1:",dedupreceive(a1[7],receivestate) );
 
 //if(a0[8])console.log("0:",dedupreceive(a0[8],receivestate));
 if(a1[8])console.log("1:",dedupreceive(a1[8],receivestate) );
 
// if(a0[9])console.log("0:",dedupreceive(a0[9],receivestate));
 if(a1[9])console.log("1:",dedupreceive(a1[9],receivestate) );
}



function test8b()
{
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

  
 var a1= [ '1 11 83dcefb7 1',
  '1 12 1ad5be0d 2',
  '1 13 6dd28e9b 3',
  '1 14 f3b61b38 4',
  '1 15 d137d16e 15',
  '1 16 483e80d4 16',
  '1 17 3f39b042 17',
  '1 18 af86add3 18',
  '1 19 d8819d45 19',
  '1 20 3a6c61ab 110' ]


 var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
 
 if(a0[0])console.log("0:",dedupreceive(a0[0],receivestate));
 if(a1[0])console.log("1:",dedupreceive(a1[0],receivestate) );
 
 if(a0[1])console.log("0:",dedupreceive(a0[1],receivestate));
 if(a1[1])console.log("1:",dedupreceive(a1[1],receivestate) );
 
 if(a0[2])console.log("0:",dedupreceive(a0[2],receivestate));
 if(a1[2])console.log("1:",dedupreceive(a1[2],receivestate) );
 
 if(a0[3])console.log("0:",dedupreceive(a0[3],receivestate));
 if(a1[3])console.log("1:",dedupreceive(a1[3],receivestate) );
 
 if(a0[4])console.log("0:",dedupreceive(a0[4],receivestate));
 if(a1[4])console.log("1:",dedupreceive(a1[4],receivestate) );
 
 if(a0[5])console.log("0:",dedupreceive(a0[5],receivestate));
 if(a1[5])console.log("1:",dedupreceive(a1[5],receivestate) );
 
 if(a0[6])console.log("0:",dedupreceive(a0[6],receivestate));
 //if(a1[6])console.log("1:",dedupreceive(a1[6],receivestate) );
 
 if(a0[7])console.log("0:",dedupreceive(a0[7],receivestate));
 //if(a1[7])console.log("1:",dedupreceive(a1[7],receivestate) );
 
 if(a0[8])console.log("0:",dedupreceive(a0[8],receivestate));
 //if(a1[8])console.log("1:",dedupreceive(a1[8],receivestate) );
 
 if(a0[9])console.log("0:",dedupreceive(a0[9],receivestate));
 //if(a1[9])console.log("1:",dedupreceive(a1[9],receivestate) );
}


test8a();

//example
//var receivestate1={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
//zmqsocket.on("message", function(str)
//{
// var re=dedupreceive(str.toString(),receivestate1);
// if(re!==undefined) console.log(re);
//});

//example2: other possible use  localy
//
//var receivestate1={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
////var sendstates={};
//function onrow(clientid,object)
//{
// if(!(clientid in sendstates))sendstates[clientid]={prev_send:null,count_send:0};
// var sendstate1=sendstates[clientid]
// var re=dedupreceive(zmqdedupsend(object,sendstate1),receivestate1);
// if(re!==undefined) console.log(re);
// else  console.log('duplicate' object);
//};

//var sendstate= {count_send:0}
//var receivestate={queues:[],queueid:{},lastqueueinsync:null,lastemitedn:-1}
//dedupsend("hello",sendstate,1)
//dedupreceive(dedupsend("hello",sendstate,1),receivestate)