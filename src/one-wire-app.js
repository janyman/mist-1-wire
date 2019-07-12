var MistNode = require('mist-api').MistNode;
var OWClient = require("owfs").Client

var owCon = new OWClient("localhost") //Assumes the owserver is running on localhost, at the default port

var name = process.env.NAME || '1-wire';

if (!process.env.NAME) { console.log('Use: NAME="OneWire n+1" to run several instances.'); }

var deviceSet = new Set();

function owfs2endpointId(owAddress) {
    
}

function scanBus(node) {
    var newDeviceSet = new Set();
    owCon.dirall("/", function (err, directories) {
        if (!directories) {
            return;
        }
        for (var d of directories) {
            
            newDeviceSet.add(d);
            
            if (deviceSet.has(d)) {
                continue;
            }
            
            ((device) => {
                var owAddress = device.split('/')[1];
                owAddress = owAddress.replace('.', '_');
                console.log("Registering 1-wire device with address ", owAddress);

                // First register the device address as endpoint
                node.addEndpoint(owAddress, {
                    type: 'string'
                });

                // Then register all the sub-items or "infoitems" that owserver automatically creates
                owCon.dirall(device, function (err, listing) {
                    for (var l of listing) {
                        ((item) => {
                            console.log(l);
                            var actualItem = item.split('/')[2]; //The elements of the listing are like '/10.ADSA232321/temperaure', we want the last piece.
                            if (!actualItem) {
                                console.log("Error when listing 1-wire devices.");
                                return;
                            }
                            /*
                            node.addEndpoint(owAddress + "." + actualItem, {
                                type: 'float',
                                read: function (args, peer, cb) {
                                    ((callback) => {
                                        owCon.read(device + "/" + actualItem, function (err, result) {
                                            if (err) {
                                                //console.log("1-wire error", err, result);
                                                callback({code: 1, msg: "1-wire read error"});
                                                return;
                                            }
                                            callback(null, result);
                                        })

                                    })(cb);


                                }
                            });
                            */
                           
                           node.addEndpoint(owAddress+"."+actualItem, {type:'float', read:true});
                           var isDirectory = false;
                           owCon.dirall(l, function (err, listing2) {
                                if (!listing2) {
                                    console.log("l is null: ", item, owAddress, actualItem);
                                    node.read(owAddress + "." + actualItem, function(args, peer, cb) {
                                        owCon.read("/" + owAddress.replace("_", ".") + "/" + actualItem, function (err, result) {
                                                     if (err) {
                                                         console.log("1-wire error", err, result);
                                                         cb({code: 1, msg: "1-wire read error"});
                                                         return;
                                                     }
                                                     cb(null, result);
                                                 })
                                    })
                                    return;
                                }
                                for (item2 of listing2) {
                                    console.log(item2);
                                    if (!item2) {
                                        continue;
                                    }
                                    isDirectory = true
                                    var actualItem2 = item2.split('/')[3];
                                    node.addEndpoint(owAddress+"."+actualItem+"."+actualItem2, {
                                        type: 'float',
                                        read: function (args, peer, cb) {
                                             ((callback) => {
                                                 owCon.read(device + "/" + actualItem + "/" + actualItem2, function (err, result) {
                                                     if (err) {
                                                         //console.log("1-wire error", err, result);
                                                         callback({code: 1, msg: "1-wire read error"});
                                                         return;
                                                     }
                                                     callback(null, result);
                                                 })

                                             })(cb);


                                         }
                                    });
                                    if (!isDirectory) {
                                        node.read(owAddress+"."+actualItem, function (args, peer, cb) {
                                             ((callback) => {
                                                 owCon.read(device + "/" + actualItem, function (err, result) {
                                                     if (err) {
                                                         //console.log("1-wire error", err, result);
                                                         callback({code: 1, msg: "1-wire read error"});
                                                         return;
                                                     }
                                                     callback(null, result);
                                                 })

                                             })(cb);
                                         });

                                    }
                                }
                           });

                        })(l);
                    }

                });
                /*
                setInterval(function () {
                    node.changed(owAddress + ".temperature");
                }, 10000);
                */


            })(d);

        }
        
        for (var dev of deviceSet) {
            if (!newDeviceSet.has(dev)) {
                var owAddr = dev.split('/')[1].replace('.', '_');
                node.removeEndpoint(owAddr);
                console.log("Removing: ", owAddr, " (but won't!)");
            }
        }
        deviceSet = newDeviceSet;
        

    });
}

function OneWire() {
    var node = new MistNode({ name: name }); // , coreIp: '127.0.0.1', corePort: 9094

    // add `mist` endpoint
    node.addEndpoint('mist', { type: 'string' });
    // add `mist.name` as subendpoint to mist
    node.addEndpoint('mist.name', { type: 'string', read: function(args, peer, cb) { cb(null, name); } });
    
    
    /* Make an initial scan of the 1-wire bus */
    scanBus(node);
        
    setInterval(function () { scanBus(node); }, 10000);
}

module.exports = {
    OneWire: OneWire
};

