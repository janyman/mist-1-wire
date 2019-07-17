var MistNode = require('mist-api').MistNode;
var OWClient = require("owfs").Client

var owCon = new OWClient("localhost") //Assumes the owserver is running on localhost, at the default port

var name = process.env.NAME || '1-wire';

if (!process.env.NAME) { console.log('Use: NAME="OneWire n+1" to run several instances.'); }

var deviceSet = new Set();

var dataCache = {};

var pollInterval = 10000;

var pollIntervals = {};

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

                
                
                owCon.read(device + '/type', function (err, deviceType) {
                    console.log(deviceType);
                    var endpointPrefix = owAddress;
                    node.addEndpoint(endpointPrefix, {type: 'string'});
                    
                    switch (deviceType) {
                        case 'DS18B20':

                            node.addEndpoint(endpointPrefix + ".temperature", {
                                type: 'float',
                                read: function (args, peer, cb) {
                                    ((callback) => {

                                        owCon.read(device + "/temperature", function (err, result) {
                                            if (err) {
                                                console.log("1-wire error", err, result);
                                                callback({code: 1, msg: "1-wire read error: " + err.options.path});
                                                return;
                                            }
                                            callback(null, parseFloat(result));
                                        })

                                    })(cb);


                                }
                            });
                            pollIntervals[device] = setInterval(function () {
                                node.changed(endpointPrefix + ".temperature");
                            }, pollInterval);
                            break;
                        case 'DS2438':
                            /* Always assume that these devices are of type MS-TH (newer model) */
                            node.addEndpoint(endpointPrefix + ".relativeHumidity", {
                                type: 'float',
                                read: function (args, peer, cb) {
                                    ((callback) => {

                                        owCon.read(device + "/HIH4000/humidity", function (err, result) {
                                            if (err) {
                                                console.log("1-wire error", err, result);
                                                callback({code: 1, msg: "1-wire read error: " + err.options.path});
                                                return;
                                            }
                                            callback(null, parseFloat(result));
                                        })

                                    })(cb);


                                }
                            });
                            
                            node.addEndpoint(endpointPrefix + ".temperature", {
                                type: 'float',
                                read: function (args, peer, cb) {
                                    ((callback) => {

                                        owCon.read(device + "/temperature", function (err, result) {
                                            if (err) {
                                                console.log("1-wire error", err, result);
                                                callback({code: 1, msg: "1-wire read error: " + err.options.path});
                                                return;
                                            }
                                            callback(null, parseFloat(result));
                                        })

                                    })(cb);


                                }
                            });
                            pollIntervals[device] = setInterval(function () {
                                node.changed(endpointPrefix + ".relativeHumidity");
                                node.changed(endpointPrefix + ".temperature");
                            }, pollInterval);
                    }
                });
                
                return;
                /* Unreachable */
                
                // First register the device address as endpoint
                node.addEndpoint(owAddress, {
                    type: 'string'
                });
                
                // Then register all the sub-items or "infoitems" that owserver automatically creates
                owCon.dirall(device, function (err, listing) {
                    for (var l of listing) {
                        ((item) => {
                            //console.log(l);
                            var actualItem = item.split('/')[2]; //The elements of the listing are like '/10.ADSA232321/temperaure', we want the last piece.
                            if (!actualItem) {
                                console.log("Error when listing 1-wire devices.");
                                return;
                            }

                           
                           node.addEndpoint(owAddress+"."+actualItem, {type:'float', read:true});
                           owCon.dirall(l, function (err, listing2) {
                                if (!listing2) {
                                    //console.log("l is null: ", item, owAddress, actualItem);
                                    node.read(owAddress + "." + actualItem, function(args, peer, cb) {
                                        owCon.read("/" + owAddress.replace("_", ".") + "/" + actualItem, function (err, result) {
                                                     if (err) {
                                                         console.log("1-wire error", err, result);
                                                         cb({code: 1, msg: "1-wire read error " + err.options.path});
                                                         return;
                                                     }
                                                     cb(null, result);
                                                 })
                                    })
                                    return;
                                }
                                for (item2 of listing2) {
                                    //console.log(item2);
                                    if (!item2) {
                                        continue;
                                    }
                                    var actualItem2 = item2.split('/')[3];
                                    actualItem2endpointId = actualItem2.split('.').join('_');
                                    
                                    node.addEndpoint(owAddress+"."+actualItem+"."+ actualItem2endpointId, {
                                        type: 'float',
                                        read: function (args, peer, cb) {
                                             ((callback) => {
                                                 
                                                 owCon.read(device + "/" + actualItem + "/" + actualItem2, function (err, result) {
                                                     if (err) {
                                                         console.log("1-wire error", err, result);
                                                         callback({code: 1, msg: "1-wire read error: " + err.options.path});
                                                         return;
                                                     }
                                                     callback(null, result);
                                                 })

                                             })(cb);


                                         }
                                    });
                                        
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
                console.log(typeof pollIntervals[dev]);
                if (pollIntervals[dev]) {
                    clearInterval(pollIntervals[dev]);
                }
                console.log("Removing: ", owAddr);
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

