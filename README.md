
![Fortnite REST Api Client banner](https://raw.githubusercontent.com/weeco/fortnite-client/develop/git-banner.jpg)

# Fortnite REST Client
[![Build Status](https://travis-ci.org/weeco/fortnite-client.svg?branch=master)](https://travis-ci.org/weeco/fortnite-client)
[![npm](https://img.shields.io/npm/v//fortnite-client.svg)](https://www.npmjs.com/package/fortnite-client)
[![codecov](https://codecov.io/gh/weeco/fortnite-client/branch/master/graph/badge.svg)](https://codecov.io/gh/weeco/fortnite-client)

A promise based REST client for querying ingame data (such as stats) against the official Fortnite game servers. A valid Fortnite account is required to access these endpoints.

### Features

- [x] Promise based methods to get any Fortnite player's stats
- [x] Fully OOP and typesafe
- [x] Throws exceptions if exceeding predefined timeouts or 4xx / 5xx status codes in response.
- [x] Written in TypeScript (provides always up to date type definitions
- [x] Covers all publicly accessible endpoints
- [x] Integration tests

**And coming up on the roadmap...**

- [ ] Event for incoming friend requests :raising_hand:
- [ ] Sending messages to friends :e-mail:
- [ ] Event for incoming friend messages :inbox_tray:

## Table of contents
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Basic usage](#basic-usage)
- [Class FortniteClient](#class-fortniteclient)
  - [Instantion](#instantion)
  - [Available endpoints](#available-endpoints)  
- [Contributors](#contributors)  
- [License](#license)

## Getting started
### Prerequisites
- [Node.js 8.0+](http://nodejs.org)
- Valid Fortnite account (email and password)
- Launcher & Client token (can both be sniffed using Fiddler)

### Installation
`$ npm install --save fortnite-client`

_**Note:** Typescript definitions are included, there is no need for installing types from the Definetely Typed Repo._

### Basic usage
Typescript (2.0+):

```typescript
import { FortniteClient, IFortniteClientCredentials, Lookup, PlayerStats } from 'fortnite-client';

const credentials: IFortniteClientCredentials = {
  email: 'weeco91@gmail.com',
  password: 'my-strong-password',
  clientLauncherToken: 'QzRhMDJjZjhmNDQxNGUyOWIxNTkyZMg3NmRhMzZmOWE6ZGHhZmJjY2M3Mzc3NDUwMzlkZmZlNTNkOTRmYzc2Y2Y=',
  clientToken: 'RHQ2ODRiOGM2ODdmNDc5ZmFkZWEzY2IyYWQ4M2Y1YzY6ZTFmMzFjMjExZjI9NDEzMTg2MjYyZDM3YTEzZuM4NGQ='
};
const api: FortniteClient = new FortniteClient(credentials);

async function bootstrap(): Promise<void> {
  try {
    await api.login();
    const ninjaLookup: Lookup = await api.lookup('ninja');
    const ninjaStats: PlayerStats = await api.getBattleRoyaleStatsById(ninjaLookup.id);
    console.log(ninjaStats.toJson());
  } catch (err) {
    console.error(err);
  }
}

bootstrap();
```

Javascript (requires ES6+):

```javascript
const FortniteClient = require('fortnite-client').FortniteClient;

const credentials = {
  email: 'weeco91@gmail.com',
  password: 'my-strong-password',
  clientLauncherToken: 'QzRhMDJjZjhmNDQxNGUyOWIxNTkyZMg3NmRhMzZmOWE6ZGHhZmJjY2M3Mzc3NDUwMzlkZmZlNTNkOTRmYzc2Y2Y=',
  clientToken: 'RHQ2ODRiOGM2ODdmNDc5ZmFkZWEzY2IyYWQ4M2Y1YzY6ZTFmMzFjMjExZjI9NDEzMTg2MjYyZDM3YTEzZuM4NGQ='
};
const api = new FortniteClient(credentials);

async function bootstrap() {
  try {
    await api.login();
    const ninjaLookup = await api.lookup('ninja');
    const ninjaStats = await api.getBattleRoyaleStatsById(ninjaLookup.id);
    console.log(ninjaStats.toJson());
  } catch (err) {
    console.error(err);
  }
}

bootstrap();
```

## Class FortniteClient
The class FortniteClient offers all available endpoints as promise based functions. Each function returns a Promise which resolves to a class instances (e. g. PlayerStats). In order to serialize the data to JSON you can just call the instance's `toJson()` method, which will return an object.

### Instantion
When creating an instance of FortniteClient you can pass a couple options which are described below:

```typescript
/**
 * Creates a new fortnite client instance.
 * @param credentials The account's credentials which shall be used for the REST requests.
 * @param options Library specific options (such as a response timeout until it throws an exception).
 */
constructor(credentials: IFortniteClientCredentials, options?: IFortniteClientOptions);

export interface IFortniteClientOptions {
  /**
   * Timeout for awaiting a response until it fails. Defaults to 5000 milliseconds.
   */
  timeoutMs?: number;
  /**
   * Tunnel requests through a proxy of your choice. If you want to inspect requests with Fiddler you have to
   * setup the proxy here.
   */
  proxy?: IProxyOptions;
}

export interface IProxyOptions {
  host: string;
  port: number;
}

```

### Available endpoints

| Route                                                                                    | Returns                    |
|------------------------------------------------------------------------------------------|----------------------------|
| `static CHECK_STATUS()` | Promise\<Status> |
| `static GET_GAME_NEWS()` | Promise\<Welcome> |
| `login()` | Promise\<void> |
| `getBattleRoyaleStatsById(userId: string, timeWindow: TimeWindow)` | Promise\<PlayerStats> |
| `getStore(locale: string = 'en-US')` | Promise\<Store> |
| `getLeaderboards(leaderboardType: LeaderboardType, platform: Platform, groupType: GroupType, timeWindow: TimeWindows, limit: number = 50)` | Promise\<Leaderboard> |
| `lookup(username: string)` | Promise\<Lookup> |


## How to analyze endpoints

**Prerequisites**
- Fiddler ( https://www.telerik.com/download/fiddler )
- Enable capture HTTPS traffic in Fiddler : Tools -> Options -> HTTPS -> Check "Capture HTTPS Connects" & "Decrypt HTTPS traffic"

**Sniffing the endpoints**
I use Fiddler to sniff and inspect the traffic sent between the Fortnite client and the game servers. Fiddler injects it's own certificate so that you can decrypt the traffic sent via HTTPS (MITM attack). However, recently Epic Games added detection of untrusted SSL certificates (SSL pinning), so that it would detect the injected custom certificate. Therefore I am currently not able to sniff on endpoints as HTTPS even encrypts the requested URL. In order to bypass this approach we would probably need to replace the certificate the Fortnite client does check for with our own custom certificate. If someone knows a better way to sniff the traffic with enabled SSL pinning please create an issue and enlighten me :). 

## Contributors
SkYNewZ (https://github.com/SkYNewZ) - Primarily helped with the Git setup including Travis CI & Code coverage reports

Contributions to the code or documentation are welcome. If you want to add a new feature please open an issue before.

## License
The MIT License (MIT)

Copyright (c) 2018 Weeco

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
