# Backend

## Install
*NOTE TO USE `yarn`, NOT `pnpm`. `pnpm` does not handle nested dependency gracefully yet.*
```bash
brew cask install docker
brew install yarn
yarn install
```

## Start

### Chain deploy
Follow guide in `chain/README.md` till can migrate the gate contract.

### MySQL
Make sure local mysql server is not running.
```bash
docker run \
  -p 3306:3306 \
  -e MYSQL_USER=oax \
  -e MYSQL_DATABASE=oax \
  -e MYSQL_ROOT_PASSWORD=oaxrules \
  -e MYSQL_PASSWORD=oaxrules \
  --detach --rm --name oax-mysql mysql:latest
```

Verify if it's running with `docker ps`:

```
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                    NAMES
c6891e475140        mysql:latest        "docker-entrypoint..."   1 second ago        Up 5 seconds        0.0.0.0:3306->3306/tcp   oax-mysql
```

If needed, database IP, name and password can be found in `./backend/config/config.json`.

Further instruction on how to use the dockerized MySQL can be found here:
https://hub.docker.com/r/library/mysql/

### Backend

The blockchain node has to be started first and the contracts have to be
compiled and deployed as described in the
[chain component's documentation](../chain/README.md).

```bash
yarn start
```

Verify if it's running:

```bash
curl http://localhost:5000
```

It should output:

```
Welcome to OAX Backend Web Server
```

## Test

*NOTE THAT* `yarn install --force` is necessary, especially when smart contracts are changed.

```bash
yarn install --force && yarn test --watch
```

## Stop

```bash
docker kill oax-mysql
```

which will throw the database away because of the `--rm` flag passed to `docker run`.

If the `--rm` flag wasn't used, the killed container state is still retained
as seen by `docker ps --all`:

```
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS                       PORTS               NAMES
c6891e475140        mysql:latest        "docker-entrypoint..."   10 seconds ago      Exited (137) 5 seconds ago                       oax-mysql
```

and had to be removed explicitly with

```
docker rm oax-mysql
```
###Usage
after some blockchain events are fired by ```/chain test``` or from frontend web3 , 
```GET http://localhost:5000/api/v1/withdrawal-requests``` and 
```http://localhost:5000/api/v1/deposit-requests```
should return results according to ```../doc/frontend-api/swagger.yaml```

### OAuth Bootstrap
Run the following to create an App and App owner to bootstrap OAuth2.
`DEFAULT_OWNER_NAME=admin@oax.org DEFAULT_OWNER_PASSWORD=oax DEFAULT_OWNER_ETH_ADDRESS=0x627306090abab3a6e1400e9345bc60c78a8bef57  DEFAULT_CLIENT_NAME=client DEFAULT_CLIENT_ID=client_id DEFAULT_CLIENT_SECRET=client_secret node bootstrap.js`