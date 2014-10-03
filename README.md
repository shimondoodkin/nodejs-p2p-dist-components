##Node.js p2p auto discovery distributed components

this is an attempt to create reliable data processing and insertion application where one node can replace another at runtime.
uses telepathine for p2p auto discovery and zmq for fast communication between nodes.

###the code is quite alpha but working.
it is written as quick solution using globals (because it faster and easier to develop and easy for debugging using repl) and no tests. but it seems working anyway.
if you like you can rewrite this without globals. i will be happy to merge your pull request. 
read the example and the code to get to know how it works.

###it has a an idea how to have multiple announcers:
send hash + the data.
the receive function only processes unique values by hash
some times data is  semi-unique like it has a more or less a same timestamp.
so you have a data for hashing that is without this timestamp. or with a lower resolion time stamp to reduce the error of using same data from two anoucers.

###it has an idea how to make sure only one component of same type is a master so only one does inserts.

the solution is simple. the last component that says that it  is the master, it is the master.
some times like in 3 nodes scenario , master disconnects and the other two set a shared key that they are the master
the one that catches is the master.

###telepathine synchronizes all changes from all peers to shared keys once in 2.5 seconds.


### a planed master switch. for exect switching:

 when peer says bye ,for each component if a master. it says to others after what number of uniques from what hash i stop inserting and you start. also maybe to emmit empty values every second and ignore them in dedup.

 implemented as ```zmq_unmaster_self();```   to run on the computer that needed to shutdown , maybe not percice
 or ```zmq_setfuturemaster();``` (type it in repl) to set master percicely
