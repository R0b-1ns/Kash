#!/bin/bash
$
docker build -t backend-finance-dev .

SHA_ID=$(docker start backend-finance-dev)

docker logs $SHA_ID
