##Node.js p2p auto discovery distributed components

this is an attempt to create reliable data processing and insertion application where one node can replace another at runtime.
uses telepathine for p2p auto discovery and zmq for realtime communication between nodes.

actually this is a pubsub with deduplication send and receive functions that can be added to any pubsub to be able to send from multiple senders similar streams and on the other end recive a unique items stream, this used to have redundancy input to a single sink. also there is a master setting mechanizm. which is useful to have redundent sinks.

###the code is quite alpha but working.
it is written as quick solution using globals (because it faster and easier to develop and easy for debugging using repl) and no tests. but it seems working anyway.
if you like you can rewrite this without globals. i will be happy to merge your pull request. 
read the example and the code to get to know how it works.

###it has a an idea how to have multiple announcers: dedup send/dedup recive
it send hash + the data, 
the receive function only processes unique values by hash.also it notices send order after synchronizing all streams on same number, and ignores already received values from other streams in the past if this streams is little delays and the value is the same. if order is same but value is different it emmits the alue ans asks to resync.

if some times the data is semi-unique like it has a more or less a same timestamp. like a timestamp you add by your self.
so you can set the data for hashing without that timestamp.

###it has an idea how to make sure only one component of same type is a master so only one does inserts.

the solution is simple. the last component that says that it is the master, it is the master.
some times like in 3 nodes scenario , master disconnects and the other two set "a shared telepathine key" that they are the master
the one that sets same key last is the master.

###telepathine synchronizes all changes from all peers to shared keys once in 2.5 seconds.


### a planed master switch. for exect switching:

 when peer says bye ,for each component if this component is a master. it says to others after what number of uniques hashes  from a specified hash it stopps working and the other master should step in. the hases can be of undefined also so to force master change it emmits undefined several values for several seconds they are ignored in the receive function.

there is ```zmq_unmaster_self();``` it sets a shard key to unmaster, than master who set last the who is master shared key is master.  to run this function on the computer that needed to shutdown , maybe not percice, it swiches on telkepathine sync.
or ```zmq_setfuturemaster();``` (type it in repl) to set master precisely. 
