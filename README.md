<h1 align="center">Welcome to tosu 👋</h1>
<img src=".github/logo.png" />
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.14.2-blue.svg" />
  <a href="https://github.com/KotRikD/tosu#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/KotRikD/tosu/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
  <a href="https://github.com/KotRikD/tosu/blob/master/LICENSE" target="_blank">
    <img alt="License: GPL--3.0" src="https://img.shields.io/github/license/KotRikD/tosu" />
  </a>
  <a href="https://twitter.com/kotrik0" target="_blank">
    <img alt="Twitter: kotrik0" src="https://img.shields.io/twitter/follow/kotrik0.svg?style=social" />
  </a>
</p>

> Eponymous software for reading osu! memory, accounting for most of gosumemory's issues

Features Done
---
- [X] LOW CPU USAGE (I actually checked, this thing has a much lower memory recoil than the gosu)
- [X] ALL GAMEMODES SUPPORT
- [X] Menu state (map information, star rating, map metadata)
- [X] Gameplay information (300's, 100's, 50's, live pp calculations, other stuff)
- [X] ResultScreen information (result screen information with grades + gameplay data)
- [ ] Tournament state (in beta right now, dont have chat reading, and some output data)
- [ ] In-game overlay (kinda hard thing to make + i need some RFC for it)

### 🏠 [Homepage](https://github.com/KotRikD/tosu#readme)

## Prerequisites

- typescript >=4.9.5
- node >=18.14.2

## Install

### Install `yarn` (if you don't have it already)

```sh
npm install -g yarn
```

### Install dependecies
```sh
yarn install
```

### Compile Memory lib

```sh
cd packages/tsprocess && npm install && npm run build
```

## Build

### Install `yarn` (if you don't have it already)

```sh
npm install -g yarn
```

### Install dependecies (optional)

```sh
yarn install
```

### Compile TS

```sh
yarn ts:compile
```

### Build App

```sh
yarn compile
```

## Usage

```sh
yarn run:dev
```

## Author

👤 **Mikhail Babynichev**

* Website: http://kotrik.ru
* Twitter: [@kotrik0](https://twitter.com/kotrik0)
* Github: [@KotRikD](https://github.com/KotRikD)

Special thanks to [@xxCherry](https://github.com/xxCherry), for providing memory reading library

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/KotRikD/tosu/issues). You can also take a look at the [contributing guide](https://github.com/KotRikD/tosu/blob/master/CONTRIBUTING.md).

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2023 [Mikhail Babynichev](https://github.com/KotRikD).<br />
This project is [GPL--3.0](https://github.com/KotRikD/tosu/blob/master/LICENSE) licensed.

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
