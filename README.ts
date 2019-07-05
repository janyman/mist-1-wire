# Mist 1-wire service

The application relies on owserver(1) for actual 1-wire access. Owserver needs to be installed first.


## Running owserver with your hardware

TBD

## Debugging

### Running owserver without 1-wire hardware

Just run 

```sh
owserver
```

This starts owserver, listning to default tcp port 4304.

### Starting owhttps for easy viewing

Assuming you have owserver running on default port:

```
owhttpd -s 4304 -p 8080
 ```