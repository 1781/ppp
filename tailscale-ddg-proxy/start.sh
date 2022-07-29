#!/bin/sh

echo 'Starting up tailscale...'

/app/tailscaled --tun=userspace-networking --socks5-server=localhost:1055 --outbound-http-proxy-listen=localhost:1055 &
/app/tailscale up --hostname=tailscale-ddg-proxy --authkey=${TAILSCALE_AUTH_KEY}

echo 'Tailscale started.'

/app/node --no-warnings --inspect=0.0.0.0:9229 tailscale-ddg-proxy.mjs
