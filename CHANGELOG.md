# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [4.3.2](https://github.com/tosuapp/tosu/compare/v4.3.1...v4.3.2) (2025-02-25)

### [4.3.1](https://github.com/tosuapp/tosu/compare/v4.3.0...v4.3.1) (2025-02-21)

## [4.3.0](https://github.com/tosuapp/tosu/compare/v4.2.0...v4.3.0) (2025-02-21)


### Features

* Sanitize path at initialization for single responsibility. ([5cc517a](https://github.com/tosuapp/tosu/commit/5cc517ad58b353653207210daea1488089f67642))
* Sanitize paths in beatmap states. ([9b07ac1](https://github.com/tosuapp/tosu/commit/9b07ac14a00a27a7ba422856ac93c14a059e24f6))
* Sanitize paths in client instances. ([73ec0ff](https://github.com/tosuapp/tosu/commit/73ec0ff32b7cd0d3ed09d3d584d0c28c3b2c984b))
* **tosu/utils:** Implement path sanitizer function. ([ec713a7](https://github.com/tosuapp/tosu/commit/ec713a73a1dab767a60f7745a60e32908e06eb6d))


### Bug Fixes

* Fix new commands no appearing in commands list ([3c9e0e5](https://github.com/tosuapp/tosu/commit/3c9e0e500be4d8b5601aa18841d0c66098e78622))
* Prevent sending file if it doesnt exists, or it's not a file ([4f252cd](https://github.com/tosuapp/tosu/commit/4f252cddaf477e305748e5f606956900f1a80e7a))
* **tosu/utils:** Introduce platform-based invalid char removal. ([f67dc20](https://github.com/tosuapp/tosu/commit/f67dc2099f6dee51c1eb2100ab2ae65944cf201e))
* **tosu/utils:** Remove os platform mention from function description. ([1117807](https://github.com/tosuapp/tosu/commit/1117807fb8a005cb3bd9fff51d9a3a4832fbc88e))
* **tosu/utils:** Save array mapping to the original variable. ([172216d](https://github.com/tosuapp/tosu/commit/172216d15afc160c0441da6cc529a49755abba34))
* update lazer profile offsets ([8ec2a29](https://github.com/tosuapp/tosu/commit/8ec2a298aa7647e8474c295408521ffa995dbc5b))

## [4.2.0](https://github.com/tosuapp/tosu/compare/v4.1.7...v4.2.0) (2025-01-24)


### Features

* Add a new `header` setting type ([59a6f6d](https://github.com/tosuapp/tosu/commit/59a6f6d0b7dfc53762f041e6baf936a0c2a9ee6d))
* Allow wildcard ip matching in `ALLOWED_IPS` ([25077ef](https://github.com/tosuapp/tosu/commit/25077eff00fb115d02c02190fb8c65c5fd67391e))
* New values for `/websocket/v2`: `isBreak` & `isKiai` ([703162a](https://github.com/tosuapp/tosu/commit/703162a3a0e0b848e28ace2ae9cf08613659426c))


### Bug Fixes

* Support http range for `/files/beatmap/audio` ([e1f49c8](https://github.com/tosuapp/tosu/commit/e1f49c8888a892c42f35d2e74597fbbd533b2a3d))
* Update beatmap status even if checksum is the same ([ee75d4a](https://github.com/tosuapp/tosu/commit/ee75d4a26c3972b2755df96503d2a455e59a4714))
* update to lazer 2025.118.2 ([cf17d17](https://github.com/tosuapp/tosu/commit/cf17d1703664c15027ad4554d6513d82ba412d25))
* Use lazer grade system for lazer client ([24d9e70](https://github.com/tosuapp/tosu/commit/24d9e70079f90bf3be8545e0b5c16bf4cdef4c59))

### [4.1.7](https://github.com/tosuapp/tosu/compare/v4.1.6...v4.1.7) (2025-01-16)


### Bug Fixes

* change configurationAddr and check for skinAddr is zero ([477a06c](https://github.com/tosuapp/tosu/commit/477a06c6167ef324ef597ce464e075b7f61a633b))

### [4.1.6](https://github.com/tosuapp/tosu/compare/v4.1.5...v4.1.6) (2025-01-08)

### [4.1.5](https://github.com/tosuapp/tosu/compare/v4.1.4...v4.1.5) (2025-01-07)

### [4.1.4](https://github.com/tosuapp/tosu/compare/v4.1.3...v4.1.4) (2024-12-27)

### [4.1.3](https://github.com/tosuapp/tosu/compare/v4.1.2...v4.1.3) (2024-12-10)

### [4.1.2](https://github.com/tosuapp/tosu/compare/v4.1.1...v4.1.2) (2024-12-09)


### Bug Fixes

* Do not create empty folder before extracting & send actual error ([95b0419](https://github.com/tosuapp/tosu/commit/95b04192b3d46416646799abea392fa425da0dd5))
* trying to read intptr 0 ([9c5cf6e](https://github.com/tosuapp/tosu/commit/9c5cf6e20b9c7fb904ed0968731042033280dc1b))
* Update logs ([9a42746](https://github.com/tosuapp/tosu/commit/9a42746f6ce0b7250e4a39110771063c827305b1))

### [4.1.1](https://github.com/tosuapp/tosu/compare/v4.1.0...v4.1.1) (2024-12-07)


### Bug Fixes

* Fix naming for new fields ([4dbd01f](https://github.com/tosuapp/tosu/commit/4dbd01f016be3448c8e4082952d71e8e536f5426))

## [4.1.0](https://github.com/tosuapp/tosu/compare/v4.0.1...v4.1.0) (2024-12-07)


### Features

* read devserver argument ([149dbec](https://github.com/tosuapp/tosu/commit/149dbec4882b5a8ac5cc73c14fccff23edd0d753))
* read user leaderboard id ([27477b3](https://github.com/tosuapp/tosu/commit/27477b3c7c62d4cb63e6e7cac43fc3123d2f69ff))


### Bug Fixes

* fix unnecessary tournament chat reset ([a144e45](https://github.com/tosuapp/tosu/commit/a144e455137e1ea68813238f4707c3a692c39740))
* Remove gosu approach to send undefined for tourney field, if clients are not ready ([ffa6017](https://github.com/tosuapp/tosu/commit/ffa6017dadd7f4f7d0a7a684b5f80ca99254638e))
* Remove RX and AP from pp and attributes calculation ([a6d74a6](https://github.com/tosuapp/tosu/commit/a6d74a618c9528e25edf5c278c1d67d77432257e))
* Switch api URL ([cc7ead6](https://github.com/tosuapp/tosu/commit/cc7ead635fe1648bc8898d1cc8366b0ce5be1852))
* try fixing game base checker ([eb2d3c3](https://github.com/tosuapp/tosu/commit/eb2d3c385fd266059dabf26f291bc321930ab43c))
* Update rosu-pp to version 2.0.0 ([b03e853](https://github.com/tosuapp/tosu/commit/b03e85349b847359b01cdb938a6a71d72ba7316a))

### [4.0.1](https://github.com/tosuapp/tosu/compare/v4.0.0...v4.0.1) (2024-11-14)


### Bug Fixes

* Extend text box size to fit in decimals ([a081abd](https://github.com/tosuapp/tosu/commit/a081abdc40f7d729bb61faa0a9225f5981b4e49a))
* Fix -1pp on some of SC overlays ([24d0caf](https://github.com/tosuapp/tosu/commit/24d0caf3a826638a46fc896762975623ab869557))
* Fix updating same name counters ([bba98e4](https://github.com/tosuapp/tosu/commit/bba98e4ff7689fe88434563937eabcdd683c7fff))
* Fix wrong pp in result screen ([7ee40e1](https://github.com/tosuapp/tosu/commit/7ee40e19133bb3fd05caf192a228ad6bf799250e))
* Hide settings pop-up when exiting overlay editing ([c19d1fc](https://github.com/tosuapp/tosu/commit/c19d1fc9ebca68367ab4fa0eebbac81e357cfd6e))
* reset gamebase if it's invalid ([69e52f5](https://github.com/tosuapp/tosu/commit/69e52f578c5123c22971e7cc7f77396a66057e28))

## [4.0.0](https://github.com/tosuapp/tosu/compare/v3.6.0...v4.0.0) (2024-11-12)


### ⚠ BREAKING CHANGES

* Detect process bitness

### Features

* add lazer placeholder ([a701b52](https://github.com/tosuapp/tosu/commit/a701b52a2a55e7e165a9e74c67efc35e036c98a7))
* add lazer placeholder ([2e9bf29](https://github.com/tosuapp/tosu/commit/2e9bf29e5f9bf8f066836fcaee497337675a8f6f))
* Added compability api for `StreamCompanion` ([04cc3c6](https://github.com/tosuapp/tosu/commit/04cc3c6bc30462187e1fcd07892599ff22b15c0c))
* Added CSR Rework ([9c43f4e](https://github.com/tosuapp/tosu/commit/9c43f4ea3cb482ffcc3c383b233a88e2fbd8da77))
* Allow running both lazer and stable, and change data accordingly ([c6204ba](https://github.com/tosuapp/tosu/commit/c6204ba90c1715a0fc4da20a314a8e2b13c20be1))
* Check for updates on `Installed` tab ([a97006e](https://github.com/tosuapp/tosu/commit/a97006e1e0e4ea777ec2ee078ca43c596b6670ec))
* classic scoring mode ([2378fc6](https://github.com/tosuapp/tosu/commit/2378fc6f23becbdfe4b483ae0cd0b93e58e86ed0))
* implement some of LazerMemory ([cb04d5d](https://github.com/tosuapp/tosu/commit/cb04d5dd3d7a5892df78820c7bad9306d6d717ab))
* implement some of LazerMemory ([a09d101](https://github.com/tosuapp/tosu/commit/a09d1010c00bba431080053dcc8fb7d78270c249))
* initial lazer gameplay impl ([3a87216](https://github.com/tosuapp/tosu/commit/3a87216eeb3be9f4ed53992aecb21ccbb0756559))
* initial lazer gameplay impl ([70edcb5](https://github.com/tosuapp/tosu/commit/70edcb58d9e2ee4b0758cd09aa3485c4116b7710))
* lazer hit errors ([556a6a0](https://github.com/tosuapp/tosu/commit/556a6a0722168083f6f3446ba88b24915600a72f))
* lazer hit errors ([fea6540](https://github.com/tosuapp/tosu/commit/fea6540a2d9a737a1efce805bbd852335397c34b))
* lazer key overlay ([c2a1776](https://github.com/tosuapp/tosu/commit/c2a1776bb6704db25021b80b2b5fd39e2fe65f8e))
* lazer key overlay ([64380b9](https://github.com/tosuapp/tosu/commit/64380b9d6bc4ca4736183861ae009a1f254dd674))
* lazer leaderboard ([60892f6](https://github.com/tosuapp/tosu/commit/60892f620d4b006f0a475edd7c5082cb64998861))
* lazer leaderboard ([2ded46a](https://github.com/tosuapp/tosu/commit/2ded46a18cc7305bc8329682c473ef4f7a7c6d0e))
* lazer menu mods ([e744945](https://github.com/tosuapp/tosu/commit/e74494574af3174246c4c602d1f2dc934938e200))
* lazer menu mods ([be8a2c7](https://github.com/tosuapp/tosu/commit/be8a2c76ba3234fcbf764595fa785ad05f4313fb))
* lazer mods settings ([c37db5d](https://github.com/tosuapp/tosu/commit/c37db5de36fd317664bd4ca76778f98685ca0026))
* lazer result screen ([57aa2de](https://github.com/tosuapp/tosu/commit/57aa2de74ebde33b85a84f7208ac93f45109c561))
* lazer result screen ([7793e33](https://github.com/tosuapp/tosu/commit/7793e33fe311954dd248cb0a95f2ca6a888e26cc))
* lazer user ([9592f17](https://github.com/tosuapp/tosu/commit/9592f17a5af6d601d51db7f4716b8844fec0d471))
* New ingame overlay ([bc99ba5](https://github.com/tosuapp/tosu/commit/bc99ba509ac50757786b46edd3cb35dad3b92d6b))
* New shortcut routes for beatmap files ([4a2480e](https://github.com/tosuapp/tosu/commit/4a2480eb13e994e2e1a0b928c41bac7e25cfab3d))
* Show amount of pp counters in installed and available ([f5512d1](https://github.com/tosuapp/tosu/commit/f5512d1a72212767b1d6c6abe78179ae3dc9d686))


### Bug Fixes

* br mod settings ([12d3c0b](https://github.com/tosuapp/tosu/commit/12d3c0b99288c18e144bf683c5f65cd19b197f3b))
* check if statistics dict is not null ([3dc1948](https://github.com/tosuapp/tosu/commit/3dc19481b5e9df23ec3800ebe85d20cd4af006cf))
* failing to read ptr on replay watching ([f60bc44](https://github.com/tosuapp/tosu/commit/f60bc44ab70847000b09ad44878411e5af014730))
* failing to read ptr on replay watching ([edd31ab](https://github.com/tosuapp/tosu/commit/edd31ab305a788696b4dd93a700ab1592deb706c))
* Fix beatmap gamemode & New field `isConvert` in v2 api ([6331b4f](https://github.com/tosuapp/tosu/commit/6331b4f40f2f899ff28f9e759e22f588a75e1af9))
* isWatchingReplay is not actually replayMode ([348b79b](https://github.com/tosuapp/tosu/commit/348b79bb52812bb46b514de91b2df3e3b173a599))
* isWatchingReplay is not actually replayMode ([4ba6218](https://github.com/tosuapp/tosu/commit/4ba621819adae201e624c94e68ce4273beb30dd9))
* mod mapping reading ([cb95a07](https://github.com/tosuapp/tosu/commit/cb95a074978fa0c328fc5fa303074acd1bea0088))
* reading online scores statistics ([4d105b3](https://github.com/tosuapp/tosu/commit/4d105b3ee3738da808c006dd814528b4fd36eaaf))
* reading online scores statistics ([602fdfd](https://github.com/tosuapp/tosu/commit/602fdfd69511f1d7258bee9df0828262daec7abd))
* reading user pp ([d47cec4](https://github.com/tosuapp/tosu/commit/d47cec43a21985d497e3897cbe25bfcd811ca2ea))
* selected mods are either list or array ([c8ef7ef](https://github.com/tosuapp/tosu/commit/c8ef7ef56e567ef56cdf37246714ddc6716ec96e))
* stable leaderboard throws when no leaderboard ([b66ebc2](https://github.com/tosuapp/tosu/commit/b66ebc295be771775fafbf9ab4047fc91e8bc415))
* stable leaderboard throws when no leaderboard ([05710f8](https://github.com/tosuapp/tosu/commit/05710f842e98a390e1c0a16340a79f5fa975e2cd))
* trying to read player on result screen ([5350c5e](https://github.com/tosuapp/tosu/commit/5350c5e61b29f85730e88a5d73d3e5b24740e3d5))
* update overlay link ([c2178e9](https://github.com/tosuapp/tosu/commit/c2178e9d5e0097e3a52364b93a687351595c56b4))
* Use platform file extension instead of .exe ([60368d7](https://github.com/tosuapp/tosu/commit/60368d765cf84165b1819504d9d380b967bece85))


* Detect process bitness ([90881ef](https://github.com/tosuapp/tosu/commit/90881efad98fbf19e9431658a4d1068ea6938f79))

## [3.6.0](https://github.com/tosuapp/tosu/compare/v3.5.2...v3.6.0) (2024-10-31)


### Features

* pp rework ([2018683](https://github.com/tosuapp/tosu/commit/2018683544901bb1ce1534eca795e4dde4d46f7d))


### Bug Fixes

* Fix out of order replacement & `undefined` values ([de464b6](https://github.com/tosuapp/tosu/commit/de464b65ac8981b5d39f94e00e89c5d33fed70ee))

### [3.5.2](https://github.com/tosuapp/tosu/compare/v3.5.1...v3.5.2) (2024-10-25)


### Bug Fixes

* Fix `settings modal` ignoring undefined fields ([31cff8d](https://github.com/tosuapp/tosu/commit/31cff8d85a582b6222e691031f7497997172288f))
* Pass geki and katu to calculateGrade ([c27fdd9](https://github.com/tosuapp/tosu/commit/c27fdd9103e06bbb2d750230db5ee673cf2f6f42))
* Patrially update settings for type commands ([42fefbb](https://github.com/tosuapp/tosu/commit/42fefbb67bd5ddbe17e198211cfcf60a90656f70))

### [3.5.1](https://github.com/tosuapp/tosu/compare/v3.5.0...v3.5.1) (2024-10-13)

## [3.5.0](https://github.com/tosuapp/tosu/compare/v3.4.0...v3.5.0) (2024-10-13)


### Features

* `Socket` and `Api` access permissions ([6d6a2d8](https://github.com/tosuapp/tosu/commit/6d6a2d8cd06a0f6b9b7cf37be9a507b9086c7c58))
* Added `beatmap stats` to each `player` ([9321e33](https://github.com/tosuapp/tosu/commit/9321e33959701e68d14db037cf7fdb0cfa747aa7))
* New counter setting `Textarea` ([25344d1](https://github.com/tosuapp/tosu/commit/25344d1d5cf0ddfe7797d3641abf24c4cff915de))
* Rewrited `Settings builder` ([ca317d4](https://github.com/tosuapp/tosu/commit/ca317d4c03f1d431efc4b8ab621b9ed54901e118))
* Rewritted `Settings` modal ([1c76749](https://github.com/tosuapp/tosu/commit/1c767491587270b2f2de7265ba93be544be83bda))
* Update button for pp counters ([a66e98e](https://github.com/tosuapp/tosu/commit/a66e98e64420fcfa731bd04d271796efffd900ec))


### Bug Fixes

* Move counter settings to `tosu/settings` folder ([adf0765](https://github.com/tosuapp/tosu/commit/adf076592383809e04b60f8b32c042679a05174c))
* store font locally ([316a5f9](https://github.com/tosuapp/tosu/commit/316a5f91fe9497c9c4f749d5f31f457c7227cbe2))

## [3.4.0](https://github.com/tosuapp/tosu/compare/v3.3.1...v3.4.0) (2024-10-05)


### Features

* Add links below header ([2f174d3](https://github.com/tosuapp/tosu/commit/2f174d3d3f189fdb69debe4967043f27cdf29c4f))


### Bug Fixes

* Actually open dashboard on startup ([471eb24](https://github.com/tosuapp/tosu/commit/471eb242e2e137d43555c2e0fe9239a66544d7ae))
* Add other platforms to open counter link api ([aa9a207](https://github.com/tosuapp/tosu/commit/aa9a207cd729039edf1ab14687afecae45eb0763))
* Reduce slow load for `installed` tab ([78eac1f](https://github.com/tosuapp/tosu/commit/78eac1fafed63937d7bd842d3c83efa6dc726f1e))
* Show note instead of hiding counter when it's downloaded ([9954526](https://github.com/tosuapp/tosu/commit/9954526d7488d7d96a682d7f7932f20a6d1dff6f))

### [3.3.1](https://github.com/tosuapp/tosu/compare/v3.3.0...v3.3.1) (2024-09-23)


### Bug Fixes

* update chat checker signature ([36b3bf6](https://github.com/tosuapp/tosu/commit/36b3bf66645595f8b4b5fb0c4c4d789142ba1a84))

## [3.3.0](https://github.com/tosuapp/tosu/compare/v3.2.2...v3.3.0) (2024-09-20)


### Features

* Write logs to a file (only in debug) ([971d205](https://github.com/tosuapp/tosu/commit/971d2053dcfe4abc2ddda6b8f3efcf998916522d))


### Bug Fixes

* Try to fix `null pointer` which cause zero pp sometimes ([6c1682e](https://github.com/tosuapp/tosu/commit/6c1682e117dc4c8260c4e59e788d5f8cffcf7265))

### [3.2.2](https://github.com/tosuapp/tosu/compare/v3.2.1...v3.2.2) (2024-09-16)


### Bug Fixes

* Fix `Can't get  map` issue ([1f29c1b](https://github.com/tosuapp/tosu/commit/1f29c1b2ec60a2f7237f7fc602d87454e7a9ef5d))

### [3.2.1](https://github.com/tosuapp/tosu/compare/v3.2.0...v3.2.1) (2024-09-12)


### Bug Fixes

* Attempt to fix undefined on converts ([bb249de](https://github.com/tosuapp/tosu/commit/bb249deda83b2eec201b5264c4e3dc0ba239f6e0))

## [3.2.0](https://github.com/tosuapp/tosu/compare/v3.1.0...v3.2.0) (2024-09-08)


### Features

* Detailed pp stats ([b76cca7](https://github.com/tosuapp/tosu/commit/b76cca72fff567bcd29f24cf8b6f3687bf248a97))


### Bug Fixes

* multiply bpm by current selected mods ([38a2ee3](https://github.com/tosuapp/tosu/commit/38a2ee3f19a5c652bdc76d6e0b1d938af3c6a0b0))
* Refresh beatmap on gamemode change (Support converts) ([3a87d64](https://github.com/tosuapp/tosu/commit/3a87d646ed6fd5cecaa80876b8d873fd9a789b78))

## [3.1.0](https://github.com/tosuapp/tosu/compare/v3.0.1...v3.1.0) (2024-08-30)


### Features

* Added realtime BPM ([da28dd6](https://github.com/tosuapp/tosu/commit/da28dd65ba12a9c97f47c65b7a4a6fb83d06a9a4))

### [3.0.1](https://github.com/tosuapp/tosu/compare/v3.0.0...v3.0.1) (2024-08-10)


### Bug Fixes

* Fix broken --update argument ([52eac7e](https://github.com/tosuapp/tosu/commit/52eac7eb200be47706467b6cfac1ae732222d3cb))
* missed readByte ([68c0e99](https://github.com/tosuapp/tosu/commit/68c0e993295fc88e46d976211219ebd8c9285c39))
* Prevent reading gameplay data before first object (mainly because of mania)( ([27b959a](https://github.com/tosuapp/tosu/commit/27b959a8d994c24f7f55e0f84451ed1df872d341))
* read addresses as uint32 instead of int64 ([b66ea31](https://github.com/tosuapp/tosu/commit/b66ea31b034a0378be94b7671303bbf610578032))
* remove extra format argument ([489aaa1](https://github.com/tosuapp/tosu/commit/489aaa19f5445319da250949b1ee8a7d3f19439c))
* remove extra format qualifier ([15a2f02](https://github.com/tosuapp/tosu/commit/15a2f02742c647a716b2f673c5666fd504ab5067))

## [3.0.0](https://github.com/tosuapp/tosu/compare/v2.10.0...v3.0.0) (2024-08-07)


### ⚠ BREAKING CHANGES

* add linux support

### Features

* add linux support ([dd9f243](https://github.com/tosuapp/tosu/commit/dd9f243662c691a5cb299a6ce6c22b7ebd5bdf11))
* batch pattern scan and various small fixes ([0521911](https://github.com/tosuapp/tosu/commit/05219118734842acf5b0160f422471cd1a2e1241))
* semicolon ([739d081](https://github.com/tosuapp/tosu/commit/739d0815047d1f757ff541add8592f3e4a264996))


### Bug Fixes

* Check sudo permissions on linux ([5b952e4](https://github.com/tosuapp/tosu/commit/5b952e41d0725b1bd0278c09fb44dd472c411b87))
* Fix path issue for `config.ini` and `static` folder ([41d0093](https://github.com/tosuapp/tosu/commit/41d0093431066e598ca1016cc2d6acb5f5de9974))
* Fix path to osu!.exe for linux ([2146ad8](https://github.com/tosuapp/tosu/commit/2146ad8efb800b7ded40dbd5bf9e7239b14cd3f8))
* remove sudo enforcement ([39373bd](https://github.com/tosuapp/tosu/commit/39373bdba5d289d00738b13cb0ec9549776e4800))
* update game time pattern ([cf6d758](https://github.com/tosuapp/tosu/commit/cf6d7584307b6df0cf10acaf05c43b79d70df67e))

## [2.10.0](https://github.com/tosuapp/tosu/compare/v2.9.2...v2.10.0) (2024-07-29)


### Bug Fixes

* Attempt to fix `null pointer` once again ([e056d7f](https://github.com/tosuapp/tosu/commit/e056d7fd0e9a6580bb9657811eee7ce506818dd7))
* FIx 0pp after retry ([bf3cac7](https://github.com/tosuapp/tosu/commit/bf3cac7a43d6e6cd717834715660f0eb62d911cb))
* Move `isReplayUiHidden` toi `AllTimesData` ([3043837](https://github.com/tosuapp/tosu/commit/304383714e31914ab7c3befc5d9ec4bc376c4f0c))
* Re:run `updateMapMetadata` if unable to get beatmap ([57c8fcf](https://github.com/tosuapp/tosu/commit/57c8fcfe132bc9c87d3b8a72e5be9ae708138d8d))
* Use SS pp in `resetCurrentAttributes` instead of 0.0 ([74867bf](https://github.com/tosuapp/tosu/commit/74867bf6e7d75ece3c79057f15dc1c334b3a05aa))

### [2.9.2](https://github.com/tosuapp/tosu/compare/v2.9.1...v2.9.2) (2024-07-23)


### Bug Fixes

* `AllTimesData` update logic ([2ab498f](https://github.com/tosuapp/tosu/commit/2ab498f69abd20d1822f854cf4876af72a84ddd2))
* Add update delay only to tournaments ([a6d1bb0](https://github.com/tosuapp/tosu/commit/a6d1bb08ffdcbd401af9b93ab9fe642a462419ee))
* Added proper credits ([04a9710](https://github.com/tosuapp/tosu/commit/04a9710b6af0c2ea1454fdfdac1a9e75856388ae))
* Attempt to fix `null pointer passed to rust` ([a369786](https://github.com/tosuapp/tosu/commit/a3697868400fc554ab79732fa6272b6fd0f214d8))
* Fix `calculatePP` option ([c3f6918](https://github.com/tosuapp/tosu/commit/c3f69182a827a224f68aa029be34f3e10e13a146))
* Optimize `calculate/pp` api and fix memory leak ([402d7f5](https://github.com/tosuapp/tosu/commit/402d7f53730d3196a98fcb7a48fd51f3064edd1f))
* Set values directly, instead of using functions ([401fb6f](https://github.com/tosuapp/tosu/commit/401fb6f061d1db4c737802bcbda4fa560996d8e8))
* Split result screen performance calculation ([37fefb4](https://github.com/tosuapp/tosu/commit/37fefb43fa9af73230ccc971ebd12dfe5636a54b))
* stop updating if `not-ready` ([da0216a](https://github.com/tosuapp/tosu/commit/da0216abd191268a7888dba41a404cf6cab3bcc1))
* Update beatmap metadata before everything ([802250a](https://github.com/tosuapp/tosu/commit/802250ad930ab910d7b668e5d258914a94d816be))
* Update graph separately on `mp3Length` change ([1810ab2](https://github.com/tosuapp/tosu/commit/1810ab2b54d3a97c144d30af4be66793d66971ae))
* Update scoreBase directly inside `updateHitErrors` ([fb254de](https://github.com/tosuapp/tosu/commit/fb254de8049ddda2bcf7859898ee7d0a80b44c05))
* Use UTC+0 date on result screen ([5c072b5](https://github.com/tosuapp/tosu/commit/5c072b5856f81f2f68de1ab6da48a91b44a9140e))

### [2.9.1](https://github.com/tosuapp/tosu/compare/v2.9.0...v2.9.1) (2024-07-14)


### Features

* new field online_id to v2 route ([a1c6d88](https://github.com/tosuapp/tosu/commit/a1c6d886f4e9af3b7d4ebd47b84b4c8dac3b1789))

## [2.9.0](https://github.com/tosuapp/tosu/compare/v2.8.1...v2.9.0) (2024-07-10)


### Features

* Add `keyOverlay` and `HitErrors` to `v2/precise` ([0be41e7](https://github.com/tosuapp/tosu/commit/0be41e72fb1b2db51f58402f7af6c2958f3a6bbe))
* Added `ipcId` to tourney clients ([cbda113](https://github.com/tosuapp/tosu/commit/cbda11306b445a6379305ac8b831da52d6648393))


### Bug Fixes

* incorrect pp for accuracy in menu ([2939ddb](https://github.com/tosuapp/tosu/commit/2939ddb96140afbba8685d6d2a0c069a62cdcdf6))
* Use own argument parser to parse osu arguments ([2aa747f](https://github.com/tosuapp/tosu/commit/2aa747f04e312a2b21adc713a3779f49a4e79f27))

### [2.8.1](https://github.com/tosuapp/tosu/compare/v2.8.0...v2.8.1) (2024-07-01)


### Bug Fixes

* FIx graph offset on the maps with long sliders at the end ([a027b44](https://github.com/tosuapp/tosu/commit/a027b44b076c0ae5cf3c01ed5039f661830cfa0d))
* Fix incorrect realtime pp from previous update ([a39dbdb](https://github.com/tosuapp/tosu/commit/a39dbdbefc08b061d92761b030b570ca5a905584))
* Fix result screen pp ([df7a0aa](https://github.com/tosuapp/tosu/commit/df7a0aaeea02ee64d6a73a7c6bc38da495059088))

## [2.8.0](https://github.com/tosuapp/tosu/compare/v2.7.1...v2.8.0) (2024-06-30)


### Features

* Added beatmap Mode, and calculate real time stars in editor ([974321e](https://github.com/tosuapp/tosu/commit/974321e0b53f624e877d6d00acea7614e70b1158))
* More data for Result screen (api v2) ([67e51dc](https://github.com/tosuapp/tosu/commit/67e51dc6e3c3a4716642c34adf4744b2efdd6616))
* Move current beatmap time to `v2/precise` ([e799ebe](https://github.com/tosuapp/tosu/commit/e799ebe2152b29582b32a703fea88716066b9639))


### Bug Fixes

* Fix default values in gameplay ([ffa2600](https://github.com/tosuapp/tosu/commit/ffa26006492ea151c9d28a8379708d9ec80fae8e))
* FIx graph X axis (api v2) ([787c0ec](https://github.com/tosuapp/tosu/commit/787c0ec8dd79ae8671cef07701fda1c591663459))
* switch to new rosu-pp version ([7870d53](https://github.com/tosuapp/tosu/commit/7870d53b22831ea95afa63eb465f959d904b0fc0))

### [2.7.1](https://github.com/tosuapp/tosu/compare/v2.7.0...v2.7.1) (2024-06-03)


### Features

* FIlters for incoming ws data ([49b70ed](https://github.com/tosuapp/tosu/commit/49b70edcbdc692de2f046d2bdc43bf270a66ef5b))


### Bug Fixes

* friend ranking can provide more than 100 entires (WTF) ([59b4435](https://github.com/tosuapp/tosu/commit/59b44357f4f4da0b52742f570fde282df523341c))

## [2.7.0](https://github.com/tosuapp/tosu/compare/v2.6.3...v2.7.0) (2024-05-22)


### Features

* Add `SHOW_MP_COMMANDS` in dashboard ([943c111](https://github.com/tosuapp/tosu/commit/943c1116c6d04254005f73baf6aed88656c59aa3))
* Add accuracy to `v1` & `v2` api ([49d5472](https://github.com/tosuapp/tosu/commit/49d547267d7349733cce76fc334409fb786c198f))


### Bug Fixes

* Fix beatmap status ([3d02ce7](https://github.com/tosuapp/tosu/commit/3d02ce774100958f5dd436f114264e9ee8e56e25))
* prevent crash on autoupdater ([8b507db](https://github.com/tosuapp/tosu/commit/8b507dbab49c03c7e17103086648ecbeb8136b6d))

### [2.6.3](https://github.com/tosuapp/tosu/compare/v2.6.2...v2.6.3) (2024-05-11)


### Bug Fixes

* (ATD)can't read int at x ([81b5575](https://github.com/tosuapp/tosu/commit/81b55751ca19e1d07d0a603fc1a7945583311137))
* fixing that 3221226505 error code ([6eb6018](https://github.com/tosuapp/tosu/commit/6eb60181ed893885411c3bf8b96773fa16a94f29))

### [2.6.2](https://github.com/tosuapp/tosu/compare/v2.6.1...v2.6.2) (2024-05-10)


### Bug Fixes

* Create `config.ini` on startup ([a5c1fe0](https://github.com/tosuapp/tosu/commit/a5c1fe0dcdb64a1c19f2bddd08c9298c1b0a7192))
* gameTimePtr isn't available in tournament mode ([e71ddda](https://github.com/tosuapp/tosu/commit/e71ddda0ad789d15f6b72b5752723c23ad7858e3))

### [2.6.1](https://github.com/tosuapp/tosu/compare/v2.6.0...v2.6.1) (2024-05-09)


### Features

* Functions print out errors when they repeat more than `x` time ([ad484df](https://github.com/tosuapp/tosu/commit/ad484dfe099dec4e450a642848c36eb73e04f3d2))


### Bug Fixes

* allow negative memory addresses ([88bda3d](https://github.com/tosuapp/tosu/commit/88bda3d64c237ee19e57229de267fef086143e1a))
* Another attempt at fixing memory leak ([ba53d04](https://github.com/tosuapp/tosu/commit/ba53d046d3e58201e3e12d61b25ed4fa4c3c3fd5))
* **entities:** Improve errors handling ([9b0707b](https://github.com/tosuapp/tosu/commit/9b0707b52ac75d834ca8251de371056d446fc2ee))
* Favicon for dashboard ([9105692](https://github.com/tosuapp/tosu/commit/910569286e120bbe205f9c73c91b79da760c2c1d))
* Fix Auto Updater ([ebea523](https://github.com/tosuapp/tosu/commit/ebea523bec71f4d2fead8f48b5a18b187865a94b))
* Handle `undefined` in `path.join` ([836d36b](https://github.com/tosuapp/tosu/commit/836d36b96e678764d5dc8893eed2cd0243c2e32f))
* Incorrect startup order ([367d7ba](https://github.com/tosuapp/tosu/commit/367d7ba6cc66e335e3243fc8cf55b020bb8457e7))

## [2.6.0](https://github.com/tosuapp/tosu/compare/v2.5.2...v2.6.0) (2024-05-07)


### Features

* Added live update for counter settings (only from dashboard) ([56c477c](https://github.com/tosuapp/tosu/commit/56c477c48a33d6d7a1cbdf666862cf0afd83079c))
* Added open dashboard & changed behaviour of autoupdate, added manual update (sort of) ([45850d5](https://github.com/tosuapp/tosu/commit/45850d5ec2cd829abf4e5e1f068dd2823d635724))
* Added open dashboard & changed behaviour of autoupdate, added manual update (sort of) ([8ee0c30](https://github.com/tosuapp/tosu/commit/8ee0c30f0747df1a994983dfedeb6b983b9dff8d))
* move to yao-pkg and bump node version ([3d6eb32](https://github.com/tosuapp/tosu/commit/3d6eb322aa3e99faa0e593f30813bfe936748bc1))
* Sanitize Settings Title and Description ([ce747c9](https://github.com/tosuapp/tosu/commit/ce747c922114c704ac3bd46699d5cdda825923a2))
* Settings builder for counters ([04106e7](https://github.com/tosuapp/tosu/commit/04106e79011e63c70a852029fd5833703236e62e))
* Settings for a pp counter ([7c3c795](https://github.com/tosuapp/tosu/commit/7c3c795d24b04b24b3d4c3c589376b4580d3b461))
* Settings for a pp counter ([d30db94](https://github.com/tosuapp/tosu/commit/d30db94fb797d4bd215b4ea55daed3c09c8d234b))
* source of dashboard script ([#118](https://github.com/tosuapp/tosu/issues/118)) ([52f7b55](https://github.com/tosuapp/tosu/commit/52f7b55de8db59929ed68edc33c2e00fedbedc8f))


### Bug Fixes

* bump workflow node ([58c1fab](https://github.com/tosuapp/tosu/commit/58c1fab73b826a6e2ea9962bff1fbb5096ee5799))
* change user profile pattern ([271be94](https://github.com/tosuapp/tosu/commit/271be941f23eb2d6fe9d19d2093e57ecd2b24fcf))
* Config issues ([bfe7d82](https://github.com/tosuapp/tosu/commit/bfe7d82c011af452d845796be6a7789ff802fc7d))
* dashboard design adjust ([3f5d01b](https://github.com/tosuapp/tosu/commit/3f5d01b38f11a968bdc4abeabbd41492746311fd))
* Dashboard improvements ([d4f6613](https://github.com/tosuapp/tosu/commit/d4f6613ddab334cce4d75a39d868b682755808d1))
* Dont crash on fetch error ([6762ec3](https://github.com/tosuapp/tosu/commit/6762ec39d3ccaeb0559e9f2d7436fcb1545b7303))
* fix incorrectly returned images ([9eb93dc](https://github.com/tosuapp/tosu/commit/9eb93dcc468e879e93b8e44db42ea95efdbcf027))
* Fix issue with counter settings flow ([d34ce62](https://github.com/tosuapp/tosu/commit/d34ce621d4762102507e04bba97f2b4c4ac35f7c))
* Fix session playTime ([f286ef9](https://github.com/tosuapp/tosu/commit/f286ef9fd01eaa0c15e743fc87f7d40d82f13260))
* Fix several counter settings issues ([04e242d](https://github.com/tosuapp/tosu/commit/04e242d326ae619c19fe41d59e11d8c4fc7b3cab))
* Fix undefined properties in api v2 ([6598271](https://github.com/tosuapp/tosu/commit/6598271abfda67cdbb6a8fe22e8073a4858bc059))
* Improve performance for precise data ([df19be7](https://github.com/tosuapp/tosu/commit/df19be701cbbb360e11ff589d5debd595f739f31))
* Improve performance for precise data ([75f9eef](https://github.com/tosuapp/tosu/commit/75f9eef34b80d8d93b19a8eea18e810c7b85015a))
* Move settings code to `Settings` Class instead of `allTimeData` Class ([cf8c5f2](https://github.com/tosuapp/tosu/commit/cf8c5f2e49f04919a4152f80f6edc63c1f50e6b8))
* Return keybinds (hopefully no memory leak this time) ([507d75a](https://github.com/tosuapp/tosu/commit/507d75a716ad4e96fc18f7c85624b20cb344bd9b))
* Use function to get statis folder path ([e118da7](https://github.com/tosuapp/tosu/commit/e118da74f218e36420e9105c25c0a26cae070683))

### [2.5.2](https://github.com/tosuapp/tosu/compare/v2.5.1...v2.5.2) (2024-03-30)


### Bug Fixes

* Fix incorrect pp if fc ([8c50e00](https://github.com/tosuapp/tosu/commit/8c50e0022d0276cb08b575e07c99d19112cb905f))
* Fix undefined which may crash program ([0872879](https://github.com/tosuapp/tosu/commit/0872879b0e3b8c22982433737cfb00675c739b06))

### [2.5.1](https://github.com/tosuapp/tosu/compare/v2.5.0...v2.5.1) (2024-03-22)


### Bug Fixes

* Fix local counters path ([#104](https://github.com/tosuapp/tosu/issues/104)) ([cf32255](https://github.com/tosuapp/tosu/commit/cf322550915ae06662a3c3b873de26506142016f))
* fix tournament manager process order ([70808b5](https://github.com/tosuapp/tosu/commit/70808b5eeca6f842338f2ea7d0f6648a74322f74))
* format player name correctly ([d99b4da](https://github.com/tosuapp/tosu/commit/d99b4da286a83f72a5f4c854c6cecdbbd6fcbd16))
* tournament ipcId wrong reading and potentional fix for chat ([3e8aee4](https://github.com/tosuapp/tosu/commit/3e8aee4d7d5e48a65569215ea0c6cbe969e683ff))

## [2.5.0](https://github.com/tosuapp/tosu/compare/v2.4.3...v2.5.0) (2024-03-10)


### ⚠ BREAKING CHANGES

* v2 `state` & `progressBar` updated

* fix: Updating keyoverlay until process is dead

* fix: reuse cached beatmap

* fix order

* fix: Move detailed errors to debug

* update error messages

* fix you

* Feat: Add process id and patterns scan progress

* fix: More detailed errors

* fix: cache beatmap for editor

* hide updateBindingState too

* cleanup

* cleanup

* fix: return reading interface visible from settingsClassAddr

* reduce error spam

* to private

### Features

* Moved `v2/keys` to `v2/precise` ([5daec8d](https://github.com/tosuapp/tosu/commit/5daec8d07bedc4fed849f8037496fa1d45ff1e49))
* remove some `Async` & `While loops` + editor pp ([#88](https://github.com/tosuapp/tosu/issues/88)) ([2c6f601](https://github.com/tosuapp/tosu/commit/2c6f6015e130026915addd9411b5e53c59f5603c))
* Renamed `KEYOVERLAY_POLL_RATE` to `PRECISE_DATA_POLL_RATE` ([bc9dadd](https://github.com/tosuapp/tosu/commit/bc9daddfd2519eaa7ca7872af6a98eda4e7911b5))


### Bug Fixes

* don't use sizeof on wstring ([db3dbd8](https://github.com/tosuapp/tosu/commit/db3dbd8c1881e4089378e81440d79e135803ca9f))
* FIx recursive counters path ([90c3faa](https://github.com/tosuapp/tosu/commit/90c3faa846c9fa95026b68af1271b394f4c31b01))
* Move full error messages to debug ([63c440c](https://github.com/tosuapp/tosu/commit/63c440c520a4dd3d1c8bd459ade0fed0d52d68e8))
* reset all gameplayData if TUPD doesn't in slot ([d3e72dd](https://github.com/tosuapp/tosu/commit/d3e72dde4c97301c19dc73f4fc7d9baea2ce5367))
* Reset keyOverlay data ([251834f](https://github.com/tosuapp/tosu/commit/251834f6ecdc50b2545d6a6047987b70a1137e95))
* reset TUPD on slot swap ([cfb75cb](https://github.com/tosuapp/tosu/commit/cfb75cb2a56fbd72bb176d9b254fb9ac3eb140ce))
* Switch from `fs.watchfile` to `setTimeout` ([77a441b](https://github.com/tosuapp/tosu/commit/77a441b328d9b4191b00f7a363eb5619d47fd30f))
* Update fields instead of entire file ([a77f737](https://github.com/tosuapp/tosu/commit/a77f737d7609f0c87133e674848b14082ea8c7cd))

### [2.4.4](https://github.com/tosuapp/tosu/compare/v2.4.3...v2.4.4) (2024-03-08)


### Bug Fixes

* don't use sizeof on wstring ([db3dbd8](https://github.com/tosuapp/tosu/commit/db3dbd8c1881e4089378e81440d79e135803ca9f))

### [2.4.3](https://github.com/tosuapp/tosu/compare/v2.4.2...v2.4.3) (2024-03-07)


### Bug Fixes

* return SongsFolder reading ([8dbfdb5](https://github.com/tosuapp/tosu/commit/8dbfdb5ccd04260c3015fe48eaba864eeccf806f))

### [2.4.2](https://github.com/tosuapp/tosu/compare/v2.4.1...v2.4.2) (2024-03-07)


### Bug Fixes

* do not open another handle to process ([de7ee37](https://github.com/tosuapp/tosu/commit/de7ee37f581743568430b325611321c0d604cb2e))
* dont convert to c_str and read correct ipcId param ([c461d24](https://github.com/tosuapp/tosu/commit/c461d245becf035b1342aaa49d916e3b02cd8e44))

### [2.4.1](https://github.com/tosuapp/tosu/compare/v2.4.0...v2.4.1) (2024-03-06)


### Bug Fixes

* update offset to ObjectCount ([6679fab](https://github.com/tosuapp/tosu/commit/6679fabff72917f93a9cf1accda904dd445f65e5))

## [2.4.0](https://github.com/tosuapp/tosu/compare/v2.3.0...v2.4.0) (2024-03-06)


### Features

* Remove `winston`, since we only use colored console.log ([dc01f8e](https://github.com/tosuapp/tosu/commit/dc01f8e52bc45f122c8904b8b7cad9b0b634dc47))


### Bug Fixes

* gosu option in .env ([e624e75](https://github.com/tosuapp/tosu/commit/e624e7560ba697a2b6bcce8c69a643985c0eb3db))
* memory leak on bindings states ([e5bc281](https://github.com/tosuapp/tosu/commit/e5bc281ef6a1b9f4a495c5c44e5ee747d85e352c))
* Refactor debug messages ([00ed181](https://github.com/tosuapp/tosu/commit/00ed181aa18e1a0ba1a2789a717223354cc4432c))
* use cached beatmap instead of opening it each time ([fef47ae](https://github.com/tosuapp/tosu/commit/fef47ae73952bc4ec0bfa8ca3fa563521c02c64d))

## [2.3.0](https://github.com/tosuapp/tosu/compare/v2.2.0...v2.3.0) (2024-03-02)


### Features

* Comment out unsupported platforms. ([3de1407](https://github.com/tosuapp/tosu/commit/3de1407e7813cb5b40f11ee1033a24a417cbb94f))
* Define artifact name as env variable ([c5eb76e](https://github.com/tosuapp/tosu/commit/c5eb76ee72d77735c87c22dd1c1d9b5623b7cf88))


### Bug Fixes

* **ci:** glob ([511cbce](https://github.com/tosuapp/tosu/commit/511cbce20a2fb1bdac0b470ef296d36f6f924a43))
* **ci:** return old style ([9b32507](https://github.com/tosuapp/tosu/commit/9b3250752b4128d867bcc6d2bb0ea9650f12fc22))
* improve deploy.yml ([463d220](https://github.com/tosuapp/tosu/commit/463d220d6e50d845b32e58b403a0ab153be23a9d))
* updater can't unarchive and restart downloaded update :/ ([03caca8](https://github.com/tosuapp/tosu/commit/03caca8d1d122fd241273e101299b76f1282d9a9))
* user drawable caches and kernel panics if GC clears it ([5c4548a](https://github.com/tosuapp/tosu/commit/5c4548a4c115571cc8a0815068d6134210b7f723))

## [2.2.0](https://github.com/tosuapp/tosu/compare/v2.1.1...v2.2.0) (2024-03-01)


### Features

* Add body parsing for POST, PATCH, PUT requests ([c4cf5e8](https://github.com/tosuapp/tosu/commit/c4cf5e8a922af0aed18f7f2ee004e80d1d40beae))
* Add button to open counter folder ([f7f3d7a](https://github.com/tosuapp/tosu/commit/f7f3d7a3c47bfc2dc308368bde5fadebcbd8a73d))
* add config reader ([#63](https://github.com/tosuapp/tosu/issues/63)) ([1e03fb6](https://github.com/tosuapp/tosu/commit/1e03fb6c2bb96c00b4e4629991494afb2b09f5d5))
* Add header ([33b4253](https://github.com/tosuapp/tosu/commit/33b42537eab76a3e80b5cd7f2d3ca513fcf5dcff))
* Add pathname to request ([35face6](https://github.com/tosuapp/tosu/commit/35face6f47cdd2562052bdc1ae3499624342e984))
* add search to counters page ([b5c9dc0](https://github.com/tosuapp/tosu/commit/b5c9dc0e370cbf25a30e6f7a1cacaef768502d9b))
* Add settings page ([d667bcb](https://github.com/tosuapp/tosu/commit/d667bcb2631b7edf10f33857c982c8edcda82d15))
* Instruction page ([59c1741](https://github.com/tosuapp/tosu/commit/59c174155339abde0e2fde9b3d416bf1f3b6b67d))
* package htmls into production build ([a2922fc](https://github.com/tosuapp/tosu/commit/a2922fc882963ccae438f913d7dfdb9686d7f57f))
* PP Counters Manager ([9d134af](https://github.com/tosuapp/tosu/commit/9d134afb8c33645864137be8bef84245366a0775))
* Show `config reloaded` message only on if settings was updated ([11fea7b](https://github.com/tosuapp/tosu/commit/11fea7badc7b3545c2e428dddcebe1aabfd40562))
* Switch from `unzipper` to `adm-zip` ([10f7d3e](https://github.com/tosuapp/tosu/commit/10f7d3eac7e499e767ab835f921c93c89c91c2c3))
* **tourney:** sort clients by ipc id ([1d08d0d](https://github.com/tosuapp/tosu/commit/1d08d0d2558c3143b7833c8cc20eb89ff02871f2))


### Bug Fixes

* .prettierignore ([0f82b69](https://github.com/tosuapp/tosu/commit/0f82b692494912fd9c61f6c7591a5353568ad97c))
* Add confirm menu for counter delete button ([8bd7840](https://github.com/tosuapp/tosu/commit/8bd7840984b394e39b37e861ba78b428d380aac4))
* Add encoding to responses ([f7aeba9](https://github.com/tosuapp/tosu/commit/f7aeba90e5881fcef86620cb207e1e81655dbbad))
* Add error handle to main page ([fd9a0cc](https://github.com/tosuapp/tosu/commit/fd9a0cc355ec22086d06cd5555d2f4d9604a2df7))
* Create file only when request is started ([707793b](https://github.com/tosuapp/tosu/commit/707793b46e348ec277a8a35be80747585ab846d0))
* empty counters, missing option, delete local counter ([1d0e4ea](https://github.com/tosuapp/tosu/commit/1d0e4ea73d7b228d9fc8bd5e1399656ce2cc59bb))
* Fix closing old websocket connections ([326c825](https://github.com/tosuapp/tosu/commit/326c82507d1cf1069304497b7ee1c81f27cfb499))
* Host files localy ([6765241](https://github.com/tosuapp/tosu/commit/676524189f8a8b19c7a7e063c07554684849a506))
* Iframe size fix + no counters message ([9a97e64](https://github.com/tosuapp/tosu/commit/9a97e64cd29759bf357abaf3e0b6979dc998322c))
* make spectating user permanent ptr ([05b1731](https://github.com/tosuapp/tosu/commit/05b1731c03be4e6efef923d1f8a656012c44e766))
* Minor api fixes ([4518544](https://github.com/tosuapp/tosu/commit/451854423345486ac8506620b8a41a06b7de494d))
* o7 unzipper ([4124294](https://github.com/tosuapp/tosu/commit/412429481e836e7060fdec94e67694936575a653))
* Remove download bar after it's finished ([0d52588](https://github.com/tosuapp/tosu/commit/0d52588c1c902306871cacb0b8fcbf209485ffda))
* replayUIVIsible not working properly ([11451cd](https://github.com/tosuapp/tosu/commit/11451cd32c2c09af46bcb2dcf9be89fbcc1e1d48))
* Routes bug with regex ([ace496d](https://github.com/tosuapp/tosu/commit/ace496d1b0e6389ba1d4b86264e0cdde27b5b8fb))
* Sort files by date ([ae5b874](https://github.com/tosuapp/tosu/commit/ae5b8744770853707595062232b12a85b38850de))

### [2.1.1](https://github.com/tosuapp/tosu/compare/v2.1.0...v2.1.1) (2024-02-26)


### Bug Fixes

* replace signature for tourney spectator ([ed12124](https://github.com/tosuapp/tosu/commit/ed121241dfc3b885bc9a1a559856f80d72807ea0))

## [2.1.0](https://github.com/tosuapp/tosu/compare/v2.0.0...v2.1.0) (2024-02-25)


### Features

* Add api to calculate pp for a map with custom parameters ([7c03eb8](https://github.com/tosuapp/tosu/commit/7c03eb872363674d66211df35b689abc59f4a836))


### Bug Fixes

* Rename fields for api v2 ([78a88b6](https://github.com/tosuapp/tosu/commit/78a88b68bdb246459d56043ae000129bf14573e3))
* Replace full url with pathname ([d8233e4](https://github.com/tosuapp/tosu/commit/d8233e493bfee753330f43ff2eca4f7db5cbb516))
* stringify message once ([c512928](https://github.com/tosuapp/tosu/commit/c51292821cb13f2e3a01b34e0f8abebb7b95eb70))

## [2.0.0](https://github.com/tosuapp/tosu/compare/v1.9.1...v2.0.0) (2024-02-19)


### ⚠ BREAKING CHANGES

* Merge (#44) API v2 

### Features

* add fields from v2 to v1 ([450fef2](https://github.com/tosuapp/tosu/commit/450fef2afc8ea70b1db301a56e36ae44e6e468c6))
* add json route for `websocket/v2/keys ([804c0a7](https://github.com/tosuapp/tosu/commit/804c0a77324d348c0aac028955df7ab6262ceb07))
* Create v2 endpoints. Json & WebSocket ([f7f2737](https://github.com/tosuapp/tosu/commit/f7f27376ea465cbaf9642bf76e6793eeac8852a7))
* disable autoupdater for development ([937a2c4](https://github.com/tosuapp/tosu/commit/937a2c4a611efb522d75d77f11bd77c5cb41a7ad))
* Display content of the songs and skin folders ([f0d37a1](https://github.com/tosuapp/tosu/commit/f0d37a13d4f41c09b0211c4324c33f02aaee088b))
* Merge ([#44](https://github.com/tosuapp/tosu/issues/44)) API v2  ([ede27fc](https://github.com/tosuapp/tosu/commit/ede27fc59f66c976cea1196a027a84ea481c1c27))
* Move `tosu/api` to `server/` ([fc8d65f](https://github.com/tosuapp/tosu/commit/fc8d65f484a692bfa42827d74fad83467a570c10))
* Move keyOverlay to their own socket (only v2) ([1b6430b](https://github.com/tosuapp/tosu/commit/1b6430b478bf545fb484e52409443136b4d34abf))
* Reload config file on the fly ([ae72f56](https://github.com/tosuapp/tosu/commit/ae72f56f4dffafdb31e09c396f8895ad6c798397))
* Rename isConnected to rawBanchoStatus + add rawLoginStatus ([79f8b36](https://github.com/tosuapp/tosu/commit/79f8b36d670bb1e50ad6947a10204e247a2f8afb))


### Bug Fixes

* add socket handler to reduce the code ([238fbc1](https://github.com/tosuapp/tosu/commit/238fbc1e3847c5b612877bfaa16a733b207c7e56))
* Combine functions into one file + remove duplicates ([b494b52](https://github.com/tosuapp/tosu/commit/b494b5298e4f84282ebe0553d291fb6508824811))
* Create static folder if doesnt exist in root folder of the program ([5dbc2e8](https://github.com/tosuapp/tosu/commit/5dbc2e82970d75d179342341a07ece6a2108a4d8))
* cyclic ([49e49f8](https://github.com/tosuapp/tosu/commit/49e49f8f43c231f7c0aeaaeb430440bf0d857d58))
* disable autoUpdate for dev mode ([3f45765](https://github.com/tosuapp/tosu/commit/3f45765399b3f77ab199323310ddf09d64b664e4))
* Fix incorrect rounding leading to results like 1.0 when it's 0.99 ([585ee10](https://github.com/tosuapp/tosu/commit/585ee10056a43ecaaac310c611e206945839e2a9))
* fixes ([5a5301b](https://github.com/tosuapp/tosu/commit/5a5301be4af037da076f26551b5e4a9ab5b1bcc1))
* forget about this file ([fa6a7df](https://github.com/tosuapp/tosu/commit/fa6a7dfdd531faf69819a25de80a9129ea0d41db))
* guard condition ([22830d7](https://github.com/tosuapp/tosu/commit/22830d7ebe948fcb4d99300a412465e54868fedf))
* Logger ([82e049e](https://github.com/tosuapp/tosu/commit/82e049e1d970aa0471327dc3aaee28acc378d362))
* make tournament scans async ([8ff5f03](https://github.com/tosuapp/tosu/commit/8ff5f03ccdb1d61176669f85fe17960c33b25e49))
* Modes order ([9c8c2ce](https://github.com/tosuapp/tosu/commit/9c8c2ce7e5bfea4580d8e621b7945d20f1548882))
* Move to own file ([ccc964c](https://github.com/tosuapp/tosu/commit/ccc964cb44a932e27dd2c5c3949e6bb12073fc4c))
* Naming for api routes ([fdfaa97](https://github.com/tosuapp/tosu/commit/fdfaa9716f0b6aba23ac0876256f6dc00be448ff))
* no src for common, server, updater ([578a8bb](https://github.com/tosuapp/tosu/commit/578a8bb3099be54bec1bdbae6c85a6fef33f900d))
* optimization for multiple connections ([fb06ca6](https://github.com/tosuapp/tosu/commit/fb06ca6da6ab89c1b620f6d30e7f049b8b9a986e))
* Remove naming confusion ([5b85e0f](https://github.com/tosuapp/tosu/commit/5b85e0f159d7c273e507a9e39a2ca96acf04c6ed))
* Remove some extensions ([fe7e092](https://github.com/tosuapp/tosu/commit/fe7e09224b2760bc6616c69b37c55ba8fb5d5bd3))
* Rename fields to be consistant ([d9dd0d7](https://github.com/tosuapp/tosu/commit/d9dd0d7bd0a07b590a8b6875bc5772a4279eb29f))
* Rename IsLoggedIn pattern name to follow rest of patterns ([680d2b0](https://github.com/tosuapp/tosu/commit/680d2b06592d225d38e7f73b9bace1d735c341c4))
* Rounup to 2 digits ([7143011](https://github.com/tosuapp/tosu/commit/714301195ad54889c089e7e5f46642a2b41afa99))
* Sometimes there is null (no clue why) ([b447855](https://github.com/tosuapp/tosu/commit/b4478554828eb9c3ab8020bf993d215e78f1c47e))
* ts ignore ([fe648fb](https://github.com/tosuapp/tosu/commit/fe648fb44c78f0e209d735d915c2f8105afecf75))
* Types and namings ([0c07369](https://github.com/tosuapp/tosu/commit/0c073693137bf8136e6b2ead0d7e31109843aa78))
* use buffer to make bigint value for ticks converter ([8d7ddf9](https://github.com/tosuapp/tosu/commit/8d7ddf9d2e778489199a4feb4a0a9b7ee6be53b5))
* Use string instead of Date for resultScreen.createAt ([a9d8f71](https://github.com/tosuapp/tosu/commit/a9d8f714f90714529580f4cfd959ff9611199712))
* Use url pathname, instead of full url with query ([ca9c50b](https://github.com/tosuapp/tosu/commit/ca9c50b61f055eb7be2257393568607e65187015))

### [1.9.1](https://github.com/tosuapp/tosu/compare/v1.9.0...v1.9.1) (2024-02-16)


### Bug Fixes

* spectator window ([#53](https://github.com/tosuapp/tosu/issues/53)) ([83323e7](https://github.com/tosuapp/tosu/commit/83323e752e3320436616811db0cf06e70bc83b69))

## [1.9.0](https://github.com/tosuapp/tosu/compare/v1.8.1...v1.9.0) (2024-02-15)


### Features

* english version ([6de5912](https://github.com/tosuapp/tosu/commit/6de5912ed50da5ef8061e311780bd8cfa1ec6d83))
* native http server ([99d210a](https://github.com/tosuapp/tosu/commit/99d210ae938af4bad9fde4870e13de4d9db5cdbe))
* switch from `find-process` to rust alternative ([a98279b](https://github.com/tosuapp/tosu/commit/a98279b68171388c29436b488959ecae8ad46ff2))
* **WIP:** detailed env config ([53bf3eb](https://github.com/tosuapp/tosu/commit/53bf3eb9ddfbc66926cffa6848e8c79c4c9af5c6))


### Bug Fixes

* attempt to fix len 0 at index 0 ([49a08da](https://github.com/tosuapp/tosu/commit/49a08da5fddfcd83b7e665d5ed950db43f786173))
* Empty background path ([0f8379c](https://github.com/tosuapp/tosu/commit/0f8379cb1a48013ccd622d6b96c9217b8abe918b))
* Fix startup issues with beatmap folder ([3a592b6](https://github.com/tosuapp/tosu/commit/3a592b6ee2f2d803837c393600eedc9501cdb932))
* graph length for dt/ht ([d821a29](https://github.com/tosuapp/tosu/commit/d821a295046a14e953976b9f8f5a30532ed63b15))
* Incorrect graph offset + add missing points to graph ([b43b621](https://github.com/tosuapp/tosu/commit/b43b62129572eed985827e9b4756c51f2e6791f2))
* Make folders path gosu compatible ([#39](https://github.com/tosuapp/tosu/issues/39)) ([5409099](https://github.com/tosuapp/tosu/commit/540909960b6e338b7af411c89a443d4f5ff44f81))
* memory leak + tournament client ([ba8edbf](https://github.com/tosuapp/tosu/commit/ba8edbfe3e270c56572a15c2004fbd01f8ba17c0))
* mit x 2021 ([57664c7](https://github.com/tosuapp/tosu/commit/57664c7fe0fc6046c5f7ee85c8c009e50b2ca85a))
* Place .env in the same directory as executable ([df14e91](https://github.com/tosuapp/tosu/commit/df14e91709de36d450c64ee6054e20b5b4f72804))
* Remove NM name from mods str ([0957b58](https://github.com/tosuapp/tosu/commit/0957b583363f512f8b12be14e9b19c1c9eb02a39))
* remove unzipper from main repo ([a974ddf](https://github.com/tosuapp/tosu/commit/a974ddfff5753791331cfd6405ee2f3d4b2e4214))
* Reset pp data on retry + enhance ([139cc2d](https://github.com/tosuapp/tosu/commit/139cc2df11b387eadb49a0daebb515d6f94f81ba))
* round bpm & multiple it by speedRate (DT/HT) ([5dc8f7a](https://github.com/tosuapp/tosu/commit/5dc8f7a28fe808b5258b8b6fcbb8ecfa56c6454c))
* use wLogger instead of console ([5a571cf](https://github.com/tosuapp/tosu/commit/5a571cf0f4f6d284a82c43c5f7ce1552dd52d419))

### [1.8.1](https://github.com/tosuapp/tosu/compare/v1.8.0...v1.8.1) (2024-01-10)


### Bug Fixes

* fix import ([#36](https://github.com/tosuapp/tosu/issues/36)) ([d2e3bba](https://github.com/tosuapp/tosu/commit/d2e3bba7206bc2b32a77578c204598244c155f66))

## [1.8.0](https://github.com/tosuapp/tosu/compare/v1.7.0...v1.8.0) (2024-01-08)


### Features

* autoupdater ([#31](https://github.com/tosuapp/tosu/issues/31)) ([1b1efd7](https://github.com/tosuapp/tosu/commit/1b1efd745ee3a82f3d7bcc732bff533208a45ecc))


### Bug Fixes

* move call to body ([93a8267](https://github.com/tosuapp/tosu/commit/93a82679daa402fede932aa11103cfa74ab12ac0))
* now i understand how it packs this ([4306827](https://github.com/tosuapp/tosu/commit/4306827d7919b565007f735b3e752c53a37b1935))
* small fix on pattern ([c0e541d](https://github.com/tosuapp/tosu/commit/c0e541d863016706d6afdd89b13d2fb6b27e0ddc))
* update pattern for current skin ([deed3cf](https://github.com/tosuapp/tosu/commit/deed3cfd7a574675264fb98a1a751eb6f12c0ac9))

## [1.8.0](https://github.com/tosuapp/tosu/compare/v1.7.0...v1.8.0) (2024-01-08)


### Features

* autoupdater ([#31](https://github.com/tosuapp/tosu/issues/31)) ([1b1efd7](https://github.com/tosuapp/tosu/commit/1b1efd745ee3a82f3d7bcc732bff533208a45ecc))


### Bug Fixes

* move call to body ([93a8267](https://github.com/tosuapp/tosu/commit/93a82679daa402fede932aa11103cfa74ab12ac0))
* small fix on pattern ([c0e541d](https://github.com/tosuapp/tosu/commit/c0e541d863016706d6afdd89b13d2fb6b27e0ddc))
* update pattern for current skin ([deed3cf](https://github.com/tosuapp/tosu/commit/deed3cfd7a574675264fb98a1a751eb6f12c0ac9))


## [1.7.0](https://github.com/tosuapp/tosu/compare/v1.6.0...v1.7.0) (2023-12-21)


### Features

* pass name to buildResult ([a57365e](https://github.com/tosuapp/tosu/commit/a57365ebd604c14f3a03bbfbbf49d7bc75a735e0))

## [1.6.0](https://github.com/tosuapp/tosu/compare/v1.5.0...v1.6.0) (2023-12-20)


### Features

* make overlay static more beautiful ([#25](https://github.com/tosuapp/tosu/issues/25)) ([f145a57](https://github.com/tosuapp/tosu/commit/f145a57d009df482a733e20fee2fce7cb7fd8904))
* userProfile reading ([#29](https://github.com/tosuapp/tosu/issues/29)) ([22ec473](https://github.com/tosuapp/tosu/commit/22ec47356d16805e139901950924a0b8fcd2bb92))


### Bug Fixes

* cors are broken ([#28](https://github.com/tosuapp/tosu/issues/28)) ([77f4e85](https://github.com/tosuapp/tosu/commit/77f4e85bf66366ee197ba769b6743a00b33fe6ae))
* if user not connected, dont update it ([318f30f](https://github.com/tosuapp/tosu/commit/318f30f1801e58a8911eae8fbd615a54c9e4e277))
* little json improvments ([#26](https://github.com/tosuapp/tosu/issues/26)) ([78033e9](https://github.com/tosuapp/tosu/commit/78033e9ddd280b32bd7e47d19132094a510f8ecb))
* reset pp values after joining songSelect ([7e11723](https://github.com/tosuapp/tosu/commit/7e11723d916274e667e17fe0302385302f340817))

## [1.5.0](https://github.com/tosuapp/tosu/compare/v1.4.1...v1.5.0) (2023-12-20)


### Features

* chat reading ([#24](https://github.com/tosuapp/tosu/issues/24)) ([0091171](https://github.com/tosuapp/tosu/commit/0091171ea519c7206ffbb73bde9c653e50b59ce5))
* contributing guide ([a0a628a](https://github.com/tosuapp/tosu/commit/a0a628aeee505eb3ec40f20f3ccd9f6955342d75))
* dont bundle node_modules/ ([7be0d63](https://github.com/tosuapp/tosu/commit/7be0d6360bc435fe4da60a426bd884f6c6e56a01))
* use fastify instead of koa ([#22](https://github.com/tosuapp/tosu/issues/22)) ([edebd3c](https://github.com/tosuapp/tosu/commit/edebd3c2885bec3a7d65c9a0e91fb974996e63e0))


### Bug Fixes

* more try/catches because at fast speeds, still having issues with offsets ([89c544e](https://github.com/tosuapp/tosu/commit/89c544e3378240feb6db14e504084a385bbeb3ca))
* use protect check instead of state for region scanner ([#23](https://github.com/tosuapp/tosu/issues/23)) ([e547bce](https://github.com/tosuapp/tosu/commit/e547bcea2fc45bd8392d53240157a64449d837b1))

### [1.4.1](https://github.com/tosuapp/tosu/compare/v1.4.0...v1.4.1) (2023-12-17)


### Bug Fixes

* most of crushs from now is catched, and fixed bId,sId of maps ([edd0e6a](https://github.com/tosuapp/tosu/commit/edd0e6a429fc17094e4e599e3912b0f59f84be63))

## [1.4.0](https://github.com/tosuapp/tosu/compare/v1.3.4...v1.4.0) (2023-12-16)


### Features

* gosumemory gameOverlay implementation ([1b1b987](https://github.com/tosuapp/tosu/commit/1b1b987dc523db9160423c8b39b0fbb6b92f34f9))

### [1.3.4](https://github.com/tosuapp/tosu/compare/v1.3.3...v1.3.4) (2023-12-15)


### Bug Fixes

* difficulty name moved too ([709744b](https://github.com/tosuapp/tosu/commit/709744bfd33244643c97be2949063f3154f759c7))

### [1.3.3](https://github.com/tosuapp/tosu/compare/v1.3.2...v1.3.3) (2023-12-15)


### Bug Fixes

* move beatmap address ([863da31](https://github.com/tosuapp/tosu/commit/863da315c3b72a48e8cb13f799e7668d7af786ee))

### [1.3.2](https://github.com/tosuapp/tosu/compare/v1.3.1...v1.3.2) (2023-12-08)


### Bug Fixes

* app won't start ([c1cd4ec](https://github.com/tosuapp/tosu/commit/c1cd4ec8ffd8afc210a39f24239cc6ec72f3360c))

### [1.3.1](https://github.com/tosuapp/tosu/compare/v1.3.0...v1.3.1) (2023-11-21)

## [1.3.0](https://github.com/tosuapp/tosu/compare/v1.2.0...v1.3.0) (2023-06-26)


### Features

* add new options to config file on startup ([c40cd0f](https://github.com/tosuapp/tosu/commit/c40cd0fc10f8ee0325c32e27bfd319bf636e9753))


### Bug Fixes

* fix font size in readme ([e2d046a](https://github.com/tosuapp/tosu/commit/e2d046a8174afec381b828e183093065812ea1c7))
* fix incorrect config names for port & ip ([22b06fe](https://github.com/tosuapp/tosu/commit/22b06fec466973395c97313ab8aebfd021d2e1a6))
* fix sending empty object when osu is not launched ([f703b4b](https://github.com/tosuapp/tosu/commit/f703b4ba8864b91f2c830bc26f59c90d1d81a5dd))
* ignore package-lock ([3551364](https://github.com/tosuapp/tosu/commit/3551364537f9f8c8484a336265238e7a21184352))
* remove adding all changes after prettier:fix ([f9af0cf](https://github.com/tosuapp/tosu/commit/f9af0cf9198bc4c5e184c9513ef3c7bf546ff56d))

## [1.2.0](https://github.com/tosuapp/tosu/compare/v1.1.0...v1.2.0) (2023-06-06)


### Features

* rename osumemory-ts to tosu ([#13](https://github.com/tosuapp/tosu/issues/13)) ([061596b](https://github.com/tosuapp/tosu/commit/061596b8f8442117404a28f7a74582eb2120d0f6))


### Bug Fixes

* empty keyoverlay object on map retry & remove big negative and positive number ([710264b](https://github.com/tosuapp/tosu/commit/710264b599ab73372603096fb5b8bf1461c63709))
* exclude unwanted data from reseting on retry ([d4239de](https://github.com/tosuapp/tosu/commit/d4239de1ad8cd764afc63b61dd3e8f3338ccfb81))
* more information about building and installing ([33b4fdc](https://github.com/tosuapp/tosu/commit/33b4fdcd233915dfc77bf899d29848167903bb51))
* optimize beatmap parsing ([#14](https://github.com/tosuapp/tosu/issues/14)) ([267fd0c](https://github.com/tosuapp/tosu/commit/267fd0c1a3a6853c3e83784a5b19decdfd283e17))
* remove flashbang ([80f2f8a](https://github.com/tosuapp/tosu/commit/80f2f8a2a984564b8dd22ec6c61c6799845408f4))

## 1.1.0 (2023-06-04)


### Features

* bump version, fix that gameplayData can't be updated, add dumb page for static, add configuration file creation ([3734b39](https://github.com/tosuapp/tosu/commit/3734b391cc1cbdac12dad36b1dcd0ce1ae258f65))
* fix PP issues, add instancesManager, and process health checker ([acfbf61](https://github.com/tosuapp/tosu/commit/acfbf61b1fc6be5c480df8dc9d1d892cfd84ae57))
* update readme.md ([6139d7f](https://github.com/tosuapp/tosu/commit/6139d7f68db19c815efca0ba3216163e1249c3d6))


### Bug Fixes

* add another temp crutch ([c520270](https://github.com/tosuapp/tosu/commit/c520270e3528c81a43004fbf19f2de0c8ceef44e))
* add husky/better prettier configuration/fix menumods for gameplay in api result ([13acf77](https://github.com/tosuapp/tosu/commit/13acf77a0d4f18af637c3f5caab8f4bd3fc8cfe2))
* add MP3Length condition to update graph ([d444281](https://github.com/tosuapp/tosu/commit/d44428107da63b6f6c4d07270de751ef61954a88))
* change dist build ([118974e](https://github.com/tosuapp/tosu/commit/118974e0683f765439511ec93031fc62a4b10b4e))
* change std graph type for now ([841f0bd](https://github.com/tosuapp/tosu/commit/841f0bde0ef07bc817c85d2e128689fa9110f4f8))
* ci ([ab97736](https://github.com/tosuapp/tosu/commit/ab9773611a9cf215a1520f1b80b11198626653e9))
* ci artifact naming ([0a3521f](https://github.com/tosuapp/tosu/commit/0a3521fb6c2f3ace877038612497614f47450fb5))
* compile memory lib? ([431d0fa](https://github.com/tosuapp/tosu/commit/431d0fa8483e4af5539f32db19e62d50070f2735))
* different Songs folder ([6e4cb1b](https://github.com/tosuapp/tosu/commit/6e4cb1bf8c8b5d56b59ae4de6cea4df86b14b47e))
* display DT instead of NCDT ([c5b9fd1](https://github.com/tosuapp/tosu/commit/c5b9fd11a2824d6dfe70c70ad17826df6aeab2b5))
* double flashlight ([82b08ca](https://github.com/tosuapp/tosu/commit/82b08cafcdebc44b99b645cc6ca27fcb5b6874f4))
* dynamic link fix ([e99a422](https://github.com/tosuapp/tosu/commit/e99a4223b37b518e69b01872f45b1822586a5fc6))
* explaining this part ([d9f3385](https://github.com/tosuapp/tosu/commit/d9f3385b1e29598c2c8aa93fe7cff78ed07ed8f0))
* fix incorrect if fc pp ([46c498d](https://github.com/tosuapp/tosu/commit/46c498d58aee3070246ca328a6b5c1c1982aac7f))
* fix potential freezes and remove unnecessary beatmap data update ([10529a2](https://github.com/tosuapp/tosu/commit/10529a274e436759c40e88ea88473e85d624238c))
* fix score for ScoreV2 mod ([f9ad93c](https://github.com/tosuapp/tosu/commit/f9ad93cf8a218c0a90fb419829e4645ec906910b))
* fix websockets ([cb80894](https://github.com/tosuapp/tosu/commit/cb808947ed8a633884e22c77d18d7c01224cd99c))
* fixed not updating gamemode in menu ([880b9d6](https://github.com/tosuapp/tosu/commit/880b9d6167610f70fa421c85e54f0686a8e913a5))
* getState undefined ([a86a1b8](https://github.com/tosuapp/tosu/commit/a86a1b8d7e1f353a8380dfeea9c3e2056a5d974e))
* secure from NaN, Infinity ([8766781](https://github.com/tosuapp/tosu/commit/8766781273507682b3dce8b0464e86bf59f1b581))
* yes ([e96c199](https://github.com/tosuapp/tosu/commit/e96c1995c2d99a718b9d1de7190b12229f8df405))
