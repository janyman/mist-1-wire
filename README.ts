# Mist 1-wire service

This is a Mist application that allows 1-wire devices to be represented in Mist.

The application relies on owserver(1) for actual 1-wire access. Owserver needs to be installed first.

## Usage
### Starting owserver with your hardware

If you install owfs on your system the system might be starting owserver for you during system startup. This means that you might need to configure owserver first. Or, you can slack like I do, and just stop owserver and re-start it with correct option. This how I do it, I have the "Link" 1-wire adapter.

```sh
sudo /etc/init.d/owserver stop
owserver --link=/dev/ttyUSB0
```

### Starting Mist 1-wire

```sh
node run.hs
```

## Debugging

### Running owserver without 1-wire hardware

Just run 

```sh
owserver
```

This starts owserver, listning to default tcp port 4304.

### Starting owhttps for more debugging

Assuming you have owserver running on default port:

```
owhttpd -s 4304 -p 8080
 ```