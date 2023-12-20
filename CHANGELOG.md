# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.5.0](https://github.com/KotRikD/tosu/compare/v1.4.1...v1.5.0) (2023-12-20)


### Features

* chat reading ([#24](https://github.com/KotRikD/tosu/issues/24)) ([0091171](https://github.com/KotRikD/tosu/commit/0091171ea519c7206ffbb73bde9c653e50b59ce5))
* contributing guide ([a0a628a](https://github.com/KotRikD/tosu/commit/a0a628aeee505eb3ec40f20f3ccd9f6955342d75))
* dont bundle node_modules/ ([7be0d63](https://github.com/KotRikD/tosu/commit/7be0d6360bc435fe4da60a426bd884f6c6e56a01))
* use fastify instead of koa ([#22](https://github.com/KotRikD/tosu/issues/22)) ([edebd3c](https://github.com/KotRikD/tosu/commit/edebd3c2885bec3a7d65c9a0e91fb974996e63e0))


### Bug Fixes

* more try/catches because at fast speeds, still having issues with offsets ([89c544e](https://github.com/KotRikD/tosu/commit/89c544e3378240feb6db14e504084a385bbeb3ca))
* use protect check instead of state for region scanner ([#23](https://github.com/KotRikD/tosu/issues/23)) ([e547bce](https://github.com/KotRikD/tosu/commit/e547bcea2fc45bd8392d53240157a64449d837b1))

### [1.4.1](https://github.com/KotRikD/tosu/compare/v1.4.0...v1.4.1) (2023-12-17)


### Bug Fixes

* most of crushs from now is catched, and fixed bId,sId of maps ([edd0e6a](https://github.com/KotRikD/tosu/commit/edd0e6a429fc17094e4e599e3912b0f59f84be63))

## [1.4.0](https://github.com/KotRikD/tosu/compare/v1.3.4...v1.4.0) (2023-12-16)


### Features

* gosumemory gameOverlay implementation ([1b1b987](https://github.com/KotRikD/tosu/commit/1b1b987dc523db9160423c8b39b0fbb6b92f34f9))

### [1.3.4](https://github.com/KotRikD/tosu/compare/v1.3.3...v1.3.4) (2023-12-15)


### Bug Fixes

* difficulty name moved too ([709744b](https://github.com/KotRikD/tosu/commit/709744bfd33244643c97be2949063f3154f759c7))

### [1.3.3](https://github.com/KotRikD/tosu/compare/v1.3.2...v1.3.3) (2023-12-15)


### Bug Fixes

* move beatmap address ([863da31](https://github.com/KotRikD/tosu/commit/863da315c3b72a48e8cb13f799e7668d7af786ee))

### [1.3.2](https://github.com/KotRikD/tosu/compare/v1.3.1...v1.3.2) (2023-12-08)


### Bug Fixes

* app won't start ([c1cd4ec](https://github.com/KotRikD/tosu/commit/c1cd4ec8ffd8afc210a39f24239cc6ec72f3360c))

### [1.3.1](https://github.com/KotRikD/tosu/compare/v1.3.0...v1.3.1) (2023-11-21)

## [1.3.0](https://github.com/KotRikD/tosu/compare/v1.2.0...v1.3.0) (2023-06-26)


### Features

* add new options to config file on startup ([c40cd0f](https://github.com/KotRikD/tosu/commit/c40cd0fc10f8ee0325c32e27bfd319bf636e9753))


### Bug Fixes

* fix font size in readme ([e2d046a](https://github.com/KotRikD/tosu/commit/e2d046a8174afec381b828e183093065812ea1c7))
* fix incorrect config names for port & ip ([22b06fe](https://github.com/KotRikD/tosu/commit/22b06fec466973395c97313ab8aebfd021d2e1a6))
* fix sending empty object when osu is not launched ([f703b4b](https://github.com/KotRikD/tosu/commit/f703b4ba8864b91f2c830bc26f59c90d1d81a5dd))
* ignore package-lock ([3551364](https://github.com/KotRikD/tosu/commit/3551364537f9f8c8484a336265238e7a21184352))
* remove adding all changes after prettier:fix ([f9af0cf](https://github.com/KotRikD/tosu/commit/f9af0cf9198bc4c5e184c9513ef3c7bf546ff56d))

## [1.2.0](https://github.com/KotRikD/tosu/compare/v1.1.0...v1.2.0) (2023-06-06)


### Features

* rename osumemory-ts to tosu ([#13](https://github.com/KotRikD/tosu/issues/13)) ([061596b](https://github.com/KotRikD/tosu/commit/061596b8f8442117404a28f7a74582eb2120d0f6))


### Bug Fixes

* empty keyoverlay object on map retry & remove big negative and positive number ([710264b](https://github.com/KotRikD/tosu/commit/710264b599ab73372603096fb5b8bf1461c63709))
* exclude unwanted data from reseting on retry ([d4239de](https://github.com/KotRikD/tosu/commit/d4239de1ad8cd764afc63b61dd3e8f3338ccfb81))
* more information about building and installing ([33b4fdc](https://github.com/KotRikD/tosu/commit/33b4fdcd233915dfc77bf899d29848167903bb51))
* optimize beatmap parsing ([#14](https://github.com/KotRikD/tosu/issues/14)) ([267fd0c](https://github.com/KotRikD/tosu/commit/267fd0c1a3a6853c3e83784a5b19decdfd283e17))
* remove flashbang ([80f2f8a](https://github.com/KotRikD/tosu/commit/80f2f8a2a984564b8dd22ec6c61c6799845408f4))

## 1.1.0 (2023-06-04)


### Features

* bump version, fix that gameplayData can't be updated, add dumb page for static, add configuration file creation ([3734b39](https://github.com/KotRikD/tosu/commit/3734b391cc1cbdac12dad36b1dcd0ce1ae258f65))
* fix PP issues, add instancesManager, and process health checker ([acfbf61](https://github.com/KotRikD/tosu/commit/acfbf61b1fc6be5c480df8dc9d1d892cfd84ae57))
* update readme.md ([6139d7f](https://github.com/KotRikD/tosu/commit/6139d7f68db19c815efca0ba3216163e1249c3d6))


### Bug Fixes

* add another temp crutch ([c520270](https://github.com/KotRikD/tosu/commit/c520270e3528c81a43004fbf19f2de0c8ceef44e))
* add husky/better prettier configuration/fix menumods for gameplay in api result ([13acf77](https://github.com/KotRikD/tosu/commit/13acf77a0d4f18af637c3f5caab8f4bd3fc8cfe2))
* add MP3Length condition to update graph ([d444281](https://github.com/KotRikD/tosu/commit/d44428107da63b6f6c4d07270de751ef61954a88))
* change dist build ([118974e](https://github.com/KotRikD/tosu/commit/118974e0683f765439511ec93031fc62a4b10b4e))
* change std graph type for now ([841f0bd](https://github.com/KotRikD/tosu/commit/841f0bde0ef07bc817c85d2e128689fa9110f4f8))
* ci ([ab97736](https://github.com/KotRikD/tosu/commit/ab9773611a9cf215a1520f1b80b11198626653e9))
* ci artifact naming ([0a3521f](https://github.com/KotRikD/tosu/commit/0a3521fb6c2f3ace877038612497614f47450fb5))
* compile memory lib? ([431d0fa](https://github.com/KotRikD/tosu/commit/431d0fa8483e4af5539f32db19e62d50070f2735))
* different Songs folder ([6e4cb1b](https://github.com/KotRikD/tosu/commit/6e4cb1bf8c8b5d56b59ae4de6cea4df86b14b47e))
* display DT instead of NCDT ([c5b9fd1](https://github.com/KotRikD/tosu/commit/c5b9fd11a2824d6dfe70c70ad17826df6aeab2b5))
* double flashlight ([82b08ca](https://github.com/KotRikD/tosu/commit/82b08cafcdebc44b99b645cc6ca27fcb5b6874f4))
* dynamic link fix ([e99a422](https://github.com/KotRikD/tosu/commit/e99a4223b37b518e69b01872f45b1822586a5fc6))
* explaining this part ([d9f3385](https://github.com/KotRikD/tosu/commit/d9f3385b1e29598c2c8aa93fe7cff78ed07ed8f0))
* fix incorrect if fc pp ([46c498d](https://github.com/KotRikD/tosu/commit/46c498d58aee3070246ca328a6b5c1c1982aac7f))
* fix potential freezes and remove unnecessary beatmap data update ([10529a2](https://github.com/KotRikD/tosu/commit/10529a274e436759c40e88ea88473e85d624238c))
* fix score for ScoreV2 mod ([f9ad93c](https://github.com/KotRikD/tosu/commit/f9ad93cf8a218c0a90fb419829e4645ec906910b))
* fix websockets ([cb80894](https://github.com/KotRikD/tosu/commit/cb808947ed8a633884e22c77d18d7c01224cd99c))
* fixed not updating gamemode in menu ([880b9d6](https://github.com/KotRikD/tosu/commit/880b9d6167610f70fa421c85e54f0686a8e913a5))
* getState undefined ([a86a1b8](https://github.com/KotRikD/tosu/commit/a86a1b8d7e1f353a8380dfeea9c3e2056a5d974e))
* secure from NaN, Infinity ([8766781](https://github.com/KotRikD/tosu/commit/8766781273507682b3dce8b0464e86bf59f1b581))
* yes ([e96c199](https://github.com/KotRikD/tosu/commit/e96c1995c2d99a718b9d1de7190b12229f8df405))
