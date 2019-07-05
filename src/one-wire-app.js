var MistNode = require('mist-api').MistNode;
var OWClient = require("owfs").Client

var owCon = new OWClient("localhost") //Assumes the owserver is running on localhost, at the default port

var name = process.env.NAME || '1-wire';

if (!process.env.NAME) { console.log('Use: NAME="OneWire n+1" to run several instances.'); }

function OneWire() {
    var node = new MistNode({ name: name }); // , coreIp: '127.0.0.1', corePort: 9094

    // add `mist` endpoint
    node.addEndpoint('mist', { type: 'string' });
    // add `mist.name` as subendpoint to mist
    node.addEndpoint('mist.name', { type: 'string', read: function(args, peer, cb) { cb(null, name); } });
    
    

    owCon.dir("/", function(err, directories){
      
        console.log("saw:", directories);
        for (d of directories) {
            
            
            ((device) => {
                var owAddress = device.split('/')[1];
                owAddress = owAddress.replace('.', '_');
                console.log(owAddress);
                
                node.addEndpoint(owAddress, {
                    type: 'string'
                });
                
                node.addEndpoint(owAddress+".temperature", {
                        type: 'float',
                        read: function(args, peer, cb) {
                            owCon.read(device + "/temperature", function(err, result){
                                cb(null, result);
                            })

                        }
                });
                
                
            })(d);
            
        }
    });
    
    // add readable and writable `number` endpoint
    
}

module.exports = {
    OneWire: OneWire
};

