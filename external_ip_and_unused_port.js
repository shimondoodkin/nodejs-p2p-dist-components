zmq_getExternalIp=function() {
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

var net=require('net')
zmq_getPort=function (portrange,cb) {
  var server = net.createServer()
  server.listen(portrange, function (err) {
    server.once('close', function () {
      cb(portrange)
    })
    server.close()
  })
  server.on('error', function (err) {
    zmq_getPort(portrange+1,cb)
  })
}