# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.6.2](https://github.com/KotRikD/tosu/compare/v2.6.1...v2.6.2) (2024-05-10)


### Bug Fixes

* Create `config.ini` on startup ([a5c1fe0](https://github.com/KotRikD/tosu/commit/a5c1fe0dcdb64a1c19f2bddd08c9298c1b0a7192))
* gameTimePtr isn't available in tournament mode ([e71ddda](https://github.com/KotRikD/tosu/commit/e71ddda0ad789d15f6b72b5752723c23ad7858e3))

### [2.6.1](https://github.com/KotRikD/tosu/compare/v2.6.0...v2.6.1) (2024-05-09)


### Features

* Functions print out errors when they repeat more than `x` time ([ad484df](https://github.com/KotRikD/tosu/commit/ad484dfe099dec4e450a642848c36eb73e04f3d2))


### Bug Fixes

* allow negative memory addresses ([88bda3d](https://github.com/KotRikD/tosu/commit/88bda3d64c237ee19e57229de267fef086143e1a))
* Another attempt at fixing memory leak ([ba53d04](https://github.com/KotRikD/tosu/commit/ba53d046d3e58201e3e12d61b25ed4fa4c3c3fd5))
* **entities:** Improve errors handling ([9b0707b](https://github.com/KotRikD/tosu/commit/9b0707b52ac75d834ca8251de371056d446fc2ee))
* Favicon for dashboard ([9105692](https://github.com/KotRikD/tosu/commit/910569286e120bbe205f9c73c91b79da760c2c1d))
* Fix Auto Updater ([ebea523](https://github.com/KotRikD/tosu/commit/ebea523bec71f4d2fead8f48b5a18b187865a94b))
* Handle `undefined` in `path.join` ([836d36b](https://github.com/KotRikD/tosu/commit/836d36b96e678764d5dc8893eed2cd0243c2e32f))
* Incorrect startup order ([367d7ba](https://github.com/KotRikD/tosu/commit/367d7ba6cc66e335e3243fc8cf55b020bb8457e7))

## [2.6.0](https://github.com/KotRikD/tosu/compare/v2.5.2...v2.6.0) (2024-05-07)


### Features

* Added live update for counter settings (only from dashboard) ([56c477c](https://github.com/KotRikD/tosu/commit/56c477c48a33d6d7a1cbdf666862cf0afd83079c))
* Added open dashboard & changed behaviour of autoupdate, added manual update (sort of) ([45850d5](https://github.com/KotRikD/tosu/commit/45850d5ec2cd829abf4e5e1f068dd2823d635724))
* Added open dashboard & changed behaviour of autoupdate, added manual update (sort of) ([8ee0c30](https://github.com/KotRikD/tosu/commit/8ee0c30f0747df1a994983dfedeb6b983b9dff8d))
* move to yao-pkg and bump node version ([3d6eb32](https://github.com/KotRikD/tosu/commit/3d6eb322aa3e99faa0e593f30813bfe936748bc1))
* Sanitize Settings Title and Description ([ce747c9](https://github.com/KotRikD/tosu/commit/ce747c922114c704ac3bd46699d5cdda825923a2))
* Settings builder for counters ([04106e7](https://github.com/KotRikD/tosu/commit/04106e79011e63c70a852029fd5833703236e62e))
* Settings for a pp counter ([7c3c795](https://github.com/KotRikD/tosu/commit/7c3c795d24b04b24b3d4c3c589376b4580d3b461))
* Settings for a pp counter ([d30db94](https://github.com/KotRikD/tosu/commit/d30db94fb797d4bd215b4ea55daed3c09c8d234b))
* source of dashboard script ([#118](https://github.com/KotRikD/tosu/issues/118)) ([52f7b55](https://github.com/KotRikD/tosu/commit/52f7b55de8db59929ed68edc33c2e00fedbedc8f))


### Bug Fixes

* bump workflow node ([58c1fab](https://github.com/KotRikD/tosu/commit/58c1fab73b826a6e2ea9962bff1fbb5096ee5799))
* change user profile pattern ([271be94](https://github.com/KotRikD/tosu/commit/271be941f23eb2d6fe9d19d2093e57ecd2b24fcf))
* Config issues ([bfe7d82](https://github.com/KotRikD/tosu/commit/bfe7d82c011af452d845796be6a7789ff802fc7d))
* dashboard design adjust ([3f5d01b](https://github.com/KotRikD/tosu/commit/3f5d01b38f11a968bdc4abeabbd41492746311fd))
* Dashboard improvements ([d4f6613](https://github.com/KotRikD/tosu/commit/d4f6613ddab334cce4d75a39d868b682755808d1))
* Dont crash on fetch error ([6762ec3](https://github.com/KotRikD/tosu/commit/6762ec39d3ccaeb0559e9f2d7436fcb1545b7303))
* fix incorrectly returned images ([9eb93dc](https://github.com/KotRikD/tosu/commit/9eb93dcc468e879e93b8e44db42ea95efdbcf027))
* Fix issue with counter settings flow ([d34ce62](https://github.com/KotRikD/tosu/commit/d34ce621d4762102507e04bba97f2b4c4ac35f7c))
* Fix session playTime ([f286ef9](https://github.com/KotRikD/tosu/commit/f286ef9fd01eaa0c15e743fc87f7d40d82f13260))
* Fix several counter settings issues ([04e242d](https://github.com/KotRikD/tosu/commit/04e242d326ae619c19fe41d59e11d8c4fc7b3cab))
* Fix undefined properties in api v2 ([6598271](https://github.com/KotRikD/tosu/commit/6598271abfda67cdbb6a8fe22e8073a4858bc059))
* Improve performance for precise data ([df19be7](https://github.com/KotRikD/tosu/commit/df19be701cbbb360e11ff589d5debd595f739f31))
* Improve performance for precise data ([75f9eef](https://github.com/KotRikD/tosu/commit/75f9eef34b80d8d93b19a8eea18e810c7b85015a))
* Move settings code to `Settings` Class instead of `allTimeData` Class ([cf8c5f2](https://github.com/KotRikD/tosu/commit/cf8c5f2e49f04919a4152f80f6edc63c1f50e6b8))
* Return keybinds (hopefully no memory leak this time) ([507d75a](https://github.com/KotRikD/tosu/commit/507d75a716ad4e96fc18f7c85624b20cb344bd9b))
* Use function to get statis folder path ([e118da7](https://github.com/KotRikD/tosu/commit/e118da74f218e36420e9105c25c0a26cae070683))

### [2.5.2](https://github.com/KotRikD/tosu/compare/v2.5.1...v2.5.2) (2024-03-30)


### Bug Fixes

* Fix incorrect pp if fc ([8c50e00](https://github.com/KotRikD/tosu/commit/8c50e0022d0276cb08b575e07c99d19112cb905f))
* Fix undefined which may crash program ([0872879](https://github.com/KotRikD/tosu/commit/0872879b0e3b8c22982433737cfb00675c739b06))

### [2.5.1](https://github.com/KotRikD/tosu/compare/v2.5.0...v2.5.1) (2024-03-22)


### Bug Fixes

* Fix local counters path ([#104](https://github.com/KotRikD/tosu/issues/104)) ([cf32255](https://github.com/KotRikD/tosu/commit/cf322550915ae06662a3c3b873de26506142016f))
* fix tournament manager process order ([70808b5](https://github.com/KotRikD/tosu/commit/70808b5eeca6f842338f2ea7d0f6648a74322f74))
* format player name correctly ([d99b4da](https://github.com/KotRikD/tosu/commit/d99b4da286a83f72a5f4c854c6cecdbbd6fcbd16))
* tournament ipcId wrong reading and potentional fix for chat ([3e8aee4](https://github.com/KotRikD/tosu/commit/3e8aee4d7d5e48a65569215ea0c6cbe969e683ff))

## [2.5.0](https://github.com/KotRikD/tosu/compare/v2.4.3...v2.5.0) (2024-03-10)


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

* Moved `v2/keys` to `v2/precise` ([5daec8d](https://github.com/KotRikD/tosu/commit/5daec8d07bedc4fed849f8037496fa1d45ff1e49))
* remove some `Async` & `While loops` + editor pp ([#88](https://github.com/KotRikD/tosu/issues/88)) ([2c6f601](https://github.com/KotRikD/tosu/commit/2c6f6015e130026915addd9411b5e53c59f5603c))
* Renamed `KEYOVERLAY_POLL_RATE` to `PRECISE_DATA_POLL_RATE` ([bc9dadd](https://github.com/KotRikD/tosu/commit/bc9daddfd2519eaa7ca7872af6a98eda4e7911b5))


### Bug Fixes

* don't use sizeof on wstring ([db3dbd8](https://github.com/KotRikD/tosu/commit/db3dbd8c1881e4089378e81440d79e135803ca9f))
* FIx recursive counters path ([90c3faa](https://github.com/KotRikD/tosu/commit/90c3faa846c9fa95026b68af1271b394f4c31b01))
* Move full error messages to debug ([63c440c](https://github.com/KotRikD/tosu/commit/63c440c520a4dd3d1c8bd459ade0fed0d52d68e8))
* reset all gameplayData if TUPD doesn't in slot ([d3e72dd](https://github.com/KotRikD/tosu/commit/d3e72dde4c97301c19dc73f4fc7d9baea2ce5367))
* Reset keyOverlay data ([251834f](https://github.com/KotRikD/tosu/commit/251834f6ecdc50b2545d6a6047987b70a1137e95))
* reset TUPD on slot swap ([cfb75cb](https://github.com/KotRikD/tosu/commit/cfb75cb2a56fbd72bb176d9b254fb9ac3eb140ce))
* Switch from `fs.watchfile` to `setTimeout` ([77a441b](https://github.com/KotRikD/tosu/commit/77a441b328d9b4191b00f7a363eb5619d47fd30f))
* Update fields instead of entire file ([a77f737](https://github.com/KotRikD/tosu/commit/a77f737d7609f0c87133e674848b14082ea8c7cd))

### [2.4.4](https://github.com/KotRikD/tosu/compare/v2.4.3...v2.4.4) (2024-03-08)


### Bug Fixes

* don't use sizeof on wstring ([db3dbd8](https://github.com/KotRikD/tosu/commit/db3dbd8c1881e4089378e81440d79e135803ca9f))

### [2.4.3](https://github.com/KotRikD/tosu/compare/v2.4.2...v2.4.3) (2024-03-07)


### Bug Fixes

* return SongsFolder reading ([8dbfdb5](https://github.com/KotRikD/tosu/commit/8dbfdb5ccd04260c3015fe48eaba864eeccf806f))

### [2.4.2](https://github.com/KotRikD/tosu/compare/v2.4.1...v2.4.2) (2024-03-07)


### Bug Fixes

* do not open another handle to process ([de7ee37](https://github.com/KotRikD/tosu/commit/de7ee37f581743568430b325611321c0d604cb2e))
* dont convert to c_str and read correct ipcId param ([c461d24](https://github.com/KotRikD/tosu/commit/c461d245becf035b1342aaa49d916e3b02cd8e44))

### [2.4.1](https://github.com/KotRikD/tosu/compare/v2.4.0...v2.4.1) (2024-03-06)


### Bug Fixes

* update offset to ObjectCount ([6679fab](https://github.com/KotRikD/tosu/commit/6679fabff72917f93a9cf1accda904dd445f65e5))

## [2.4.0](https://github.com/KotRikD/tosu/compare/v2.3.0...v2.4.0) (2024-03-06)


### Features

* Remove `winston`, since we only use colored console.log ([dc01f8e](https://github.com/KotRikD/tosu/commit/dc01f8e52bc45f122c8904b8b7cad9b0b634dc47))


### Bug Fixes

* gosu option in .env ([e624e75](https://github.com/KotRikD/tosu/commit/e624e7560ba697a2b6bcce8c69a643985c0eb3db))
* memory leak on bindings states ([e5bc281](https://github.com/KotRikD/tosu/commit/e5bc281ef6a1b9f4a495c5c44e5ee747d85e352c))
* Refactor debug messages ([00ed181](https://github.com/KotRikD/tosu/commit/00ed181aa18e1a0ba1a2789a717223354cc4432c))
* use cached beatmap instead of opening it each time ([fef47ae](https://github.com/KotRikD/tosu/commit/fef47ae73952bc4ec0bfa8ca3fa563521c02c64d))

## [2.3.0](https://github.com/KotRikD/tosu/compare/v2.2.0...v2.3.0) (2024-03-02)


### Features

* Comment out unsupported platforms. ([3de1407](https://github.com/KotRikD/tosu/commit/3de1407e7813cb5b40f11ee1033a24a417cbb94f))
* Define artifact name as env variable ([c5eb76e](https://github.com/KotRikD/tosu/commit/c5eb76ee72d77735c87c22dd1c1d9b5623b7cf88))


### Bug Fixes

* **ci:** glob ([511cbce](https://github.com/KotRikD/tosu/commit/511cbce20a2fb1bdac0b470ef296d36f6f924a43))
* **ci:** return old style ([9b32507](https://github.com/KotRikD/tosu/commit/9b3250752b4128d867bcc6d2bb0ea9650f12fc22))
* improve deploy.yml ([463d220](https://github.com/KotRikD/tosu/commit/463d220d6e50d845b32e58b403a0ab153be23a9d))
* updater can't unarchive and restart downloaded update :/ ([03caca8](https://github.com/KotRikD/tosu/commit/03caca8d1d122fd241273e101299b76f1282d9a9))
* user drawable caches and kernel panics if GC clears it ([5c4548a](https://github.com/KotRikD/tosu/commit/5c4548a4c115571cc8a0815068d6134210b7f723))

## [2.2.0](https://github.com/KotRikD/tosu/compare/v2.1.1...v2.2.0) (2024-03-01)


### Features

* Add body parsing for POST, PATCH, PUT requests ([c4cf5e8](https://github.com/KotRikD/tosu/commit/c4cf5e8a922af0aed18f7f2ee004e80d1d40beae))
* Add button to open counter folder ([f7f3d7a](https://github.com/KotRikD/tosu/commit/f7f3d7a3c47bfc2dc308368bde5fadebcbd8a73d))
* add config reader ([#63](https://github.com/KotRikD/tosu/issues/63)) ([1e03fb6](https://github.com/KotRikD/tosu/commit/1e03fb6c2bb96c00b4e4629991494afb2b09f5d5))
* Add header ([33b4253](https://github.com/KotRikD/tosu/commit/33b42537eab76a3e80b5cd7f2d3ca513fcf5dcff))
* Add pathname to request ([35face6](https://github.com/KotRikD/tosu/commit/35face6f47cdd2562052bdc1ae3499624342e984))
* add search to counters page ([b5c9dc0](https://github.com/KotRikD/tosu/commit/b5c9dc0e370cbf25a30e6f7a1cacaef768502d9b))
* Add settings page ([d667bcb](https://github.com/KotRikD/tosu/commit/d667bcb2631b7edf10f33857c982c8edcda82d15))
* Instruction page ([59c1741](https://github.com/KotRikD/tosu/commit/59c174155339abde0e2fde9b3d416bf1f3b6b67d))
* package htmls into production build ([a2922fc](https://github.com/KotRikD/tosu/commit/a2922fc882963ccae438f913d7dfdb9686d7f57f))
* PP Counters Manager ([9d134af](https://github.com/KotRikD/tosu/commit/9d134afb8c33645864137be8bef84245366a0775))
* Show `config reloaded` message only on if settings was updated ([11fea7b](https://github.com/KotRikD/tosu/commit/11fea7badc7b3545c2e428dddcebe1aabfd40562))
* Switch from `unzipper` to `adm-zip` ([10f7d3e](https://github.com/KotRikD/tosu/commit/10f7d3eac7e499e767ab835f921c93c89c91c2c3))
* **tourney:** sort clients by ipc id ([1d08d0d](https://github.com/KotRikD/tosu/commit/1d08d0d2558c3143b7833c8cc20eb89ff02871f2))


### Bug Fixes

* .prettierignore ([0f82b69](https://github.com/KotRikD/tosu/commit/0f82b692494912fd9c61f6c7591a5353568ad97c))
* Add confirm menu for counter delete button ([8bd7840](https://github.com/KotRikD/tosu/commit/8bd7840984b394e39b37e861ba78b428d380aac4))
* Add encoding to responses ([f7aeba9](https://github.com/KotRikD/tosu/commit/f7aeba90e5881fcef86620cb207e1e81655dbbad))
* Add error handle to main page ([fd9a0cc](https://github.com/KotRikD/tosu/commit/fd9a0cc355ec22086d06cd5555d2f4d9604a2df7))
* Create file only when request is started ([707793b](https://github.com/KotRikD/tosu/commit/707793b46e348ec277a8a35be80747585ab846d0))
* empty counters, missing option, delete local counter ([1d0e4ea](https://github.com/KotRikD/tosu/commit/1d0e4ea73d7b228d9fc8bd5e1399656ce2cc59bb))
* Fix closing old websocket connections ([326c825](https://github.com/KotRikD/tosu/commit/326c82507d1cf1069304497b7ee1c81f27cfb499))
* Host files localy ([6765241](https://github.com/KotRikD/tosu/commit/676524189f8a8b19c7a7e063c07554684849a506))
* Iframe size fix + no counters message ([9a97e64](https://github.com/KotRikD/tosu/commit/9a97e64cd29759bf357abaf3e0b6979dc998322c))
* make spectating user permanent ptr ([05b1731](https://github.com/KotRikD/tosu/commit/05b1731c03be4e6efef923d1f8a656012c44e766))
* Minor api fixes ([4518544](https://github.com/KotRikD/tosu/commit/451854423345486ac8506620b8a41a06b7de494d))
* o7 unzipper ([4124294](https://github.com/KotRikD/tosu/commit/412429481e836e7060fdec94e67694936575a653))
* Remove download bar after it's finished ([0d52588](https://github.com/KotRikD/tosu/commit/0d52588c1c902306871cacb0b8fcbf209485ffda))
* replayUIVIsible not working properly ([11451cd](https://github.com/KotRikD/tosu/commit/11451cd32c2c09af46bcb2dcf9be89fbcc1e1d48))
* Routes bug with regex ([ace496d](https://github.com/KotRikD/tosu/commit/ace496d1b0e6389ba1d4b86264e0cdde27b5b8fb))
* Sort files by date ([ae5b874](https://github.com/KotRikD/tosu/commit/ae5b8744770853707595062232b12a85b38850de))

### [2.1.1](https://github.com/KotRikD/tosu/compare/v2.1.0...v2.1.1) (2024-02-26)


### Bug Fixes

* replace signature for tourney spectator ([ed12124](https://github.com/KotRikD/tosu/commit/ed121241dfc3b885bc9a1a559856f80d72807ea0))

## [2.1.0](https://github.com/KotRikD/tosu/compare/v2.0.0...v2.1.0) (2024-02-25)


### Features

* Add api to calculate pp for a map with custom parameters ([7c03eb8](https://github.com/KotRikD/tosu/commit/7c03eb872363674d66211df35b689abc59f4a836))


### Bug Fixes

* Rename fields for api v2 ([78a88b6](https://github.com/KotRikD/tosu/commit/78a88b68bdb246459d56043ae000129bf14573e3))
* Replace full url with pathname ([d8233e4](https://github.com/KotRikD/tosu/commit/d8233e493bfee753330f43ff2eca4f7db5cbb516))
* stringify message once ([c512928](https://github.com/KotRikD/tosu/commit/c51292821cb13f2e3a01b34e0f8abebb7b95eb70))

## [2.0.0](https://github.com/KotRikD/tosu/compare/v1.9.1...v2.0.0) (2024-02-19)


### ⚠ BREAKING CHANGES

* Merge (#44) API v2 

### Features

* add fields from v2 to v1 ([450fef2](https://github.com/KotRikD/tosu/commit/450fef2afc8ea70b1db301a56e36ae44e6e468c6))
* add json route for `websocket/v2/keys ([804c0a7](https://github.com/KotRikD/tosu/commit/804c0a77324d348c0aac028955df7ab6262ceb07))
* Create v2 endpoints. Json & WebSocket ([f7f2737](https://github.com/KotRikD/tosu/commit/f7f27376ea465cbaf9642bf76e6793eeac8852a7))
* disable autoupdater for development ([937a2c4](https://github.com/KotRikD/tosu/commit/937a2c4a611efb522d75d77f11bd77c5cb41a7ad))
* Display content of the songs and skin folders ([f0d37a1](https://github.com/KotRikD/tosu/commit/f0d37a13d4f41c09b0211c4324c33f02aaee088b))
* Merge ([#44](https://github.com/KotRikD/tosu/issues/44)) API v2  ([ede27fc](https://github.com/KotRikD/tosu/commit/ede27fc59f66c976cea1196a027a84ea481c1c27))
* Move `tosu/api` to `server/` ([fc8d65f](https://github.com/KotRikD/tosu/commit/fc8d65f484a692bfa42827d74fad83467a570c10))
* Move keyOverlay to their own socket (only v2) ([1b6430b](https://github.com/KotRikD/tosu/commit/1b6430b478bf545fb484e52409443136b4d34abf))
* Reload config file on the fly ([ae72f56](https://github.com/KotRikD/tosu/commit/ae72f56f4dffafdb31e09c396f8895ad6c798397))
* Rename isConnected to rawBanchoStatus + add rawLoginStatus ([79f8b36](https://github.com/KotRikD/tosu/commit/79f8b36d670bb1e50ad6947a10204e247a2f8afb))


### Bug Fixes

* add socket handler to reduce the code ([238fbc1](https://github.com/KotRikD/tosu/commit/238fbc1e3847c5b612877bfaa16a733b207c7e56))
* Combine functions into one file + remove duplicates ([b494b52](https://github.com/KotRikD/tosu/commit/b494b5298e4f84282ebe0553d291fb6508824811))
* Create static folder if doesnt exist in root folder of the program ([5dbc2e8](https://github.com/KotRikD/tosu/commit/5dbc2e82970d75d179342341a07ece6a2108a4d8))
* cyclic ([49e49f8](https://github.com/KotRikD/tosu/commit/49e49f8f43c231f7c0aeaaeb430440bf0d857d58))
* disable autoUpdate for dev mode ([3f45765](https://github.com/KotRikD/tosu/commit/3f45765399b3f77ab199323310ddf09d64b664e4))
* Fix incorrect rounding leading to results like 1.0 when it's 0.99 ([585ee10](https://github.com/KotRikD/tosu/commit/585ee10056a43ecaaac310c611e206945839e2a9))
* fixes ([5a5301b](https://github.com/KotRikD/tosu/commit/5a5301be4af037da076f26551b5e4a9ab5b1bcc1))
* forget about this file ([fa6a7df](https://github.com/KotRikD/tosu/commit/fa6a7dfdd531faf69819a25de80a9129ea0d41db))
* guard condition ([22830d7](https://github.com/KotRikD/tosu/commit/22830d7ebe948fcb4d99300a412465e54868fedf))
* Logger ([82e049e](https://github.com/KotRikD/tosu/commit/82e049e1d970aa0471327dc3aaee28acc378d362))
* make tournament scans async ([8ff5f03](https://github.com/KotRikD/tosu/commit/8ff5f03ccdb1d61176669f85fe17960c33b25e49))
* Modes order ([9c8c2ce](https://github.com/KotRikD/tosu/commit/9c8c2ce7e5bfea4580d8e621b7945d20f1548882))
* Move to own file ([ccc964c](https://github.com/KotRikD/tosu/commit/ccc964cb44a932e27dd2c5c3949e6bb12073fc4c))
* Naming for api routes ([fdfaa97](https://github.com/KotRikD/tosu/commit/fdfaa9716f0b6aba23ac0876256f6dc00be448ff))
* no src for common, server, updater ([578a8bb](https://github.com/KotRikD/tosu/commit/578a8bb3099be54bec1bdbae6c85a6fef33f900d))
* optimization for multiple connections ([fb06ca6](https://github.com/KotRikD/tosu/commit/fb06ca6da6ab89c1b620f6d30e7f049b8b9a986e))
* Remove naming confusion ([5b85e0f](https://github.com/KotRikD/tosu/commit/5b85e0f159d7c273e507a9e39a2ca96acf04c6ed))
* Remove some extensions ([fe7e092](https://github.com/KotRikD/tosu/commit/fe7e09224b2760bc6616c69b37c55ba8fb5d5bd3))
* Rename fields to be consistant ([d9dd0d7](https://github.com/KotRikD/tosu/commit/d9dd0d7bd0a07b590a8b6875bc5772a4279eb29f))
* Rename IsLoggedIn pattern name to follow rest of patterns ([680d2b0](https://github.com/KotRikD/tosu/commit/680d2b06592d225d38e7f73b9bace1d735c341c4))
* Rounup to 2 digits ([7143011](https://github.com/KotRikD/tosu/commit/714301195ad54889c089e7e5f46642a2b41afa99))
* Sometimes there is null (no clue why) ([b447855](https://github.com/KotRikD/tosu/commit/b4478554828eb9c3ab8020bf993d215e78f1c47e))
* ts ignore ([fe648fb](https://github.com/KotRikD/tosu/commit/fe648fb44c78f0e209d735d915c2f8105afecf75))
* Types and namings ([0c07369](https://github.com/KotRikD/tosu/commit/0c073693137bf8136e6b2ead0d7e31109843aa78))
* use buffer to make bigint value for ticks converter ([8d7ddf9](https://github.com/KotRikD/tosu/commit/8d7ddf9d2e778489199a4feb4a0a9b7ee6be53b5))
* Use string instead of Date for resultScreen.createAt ([a9d8f71](https://github.com/KotRikD/tosu/commit/a9d8f714f90714529580f4cfd959ff9611199712))
* Use url pathname, instead of full url with query ([ca9c50b](https://github.com/KotRikD/tosu/commit/ca9c50b61f055eb7be2257393568607e65187015))

### [1.9.1](https://github.com/KotRikD/tosu/compare/v1.9.0...v1.9.1) (2024-02-16)


### Bug Fixes

* spectator window ([#53](https://github.com/KotRikD/tosu/issues/53)) ([83323e7](https://github.com/KotRikD/tosu/commit/83323e752e3320436616811db0cf06e70bc83b69))

## [1.9.0](https://github.com/KotRikD/tosu/compare/v1.8.1...v1.9.0) (2024-02-15)


### Features

* english version ([6de5912](https://github.com/KotRikD/tosu/commit/6de5912ed50da5ef8061e311780bd8cfa1ec6d83))
* native http server ([99d210a](https://github.com/KotRikD/tosu/commit/99d210ae938af4bad9fde4870e13de4d9db5cdbe))
* switch from `find-process` to rust alternative ([a98279b](https://github.com/KotRikD/tosu/commit/a98279b68171388c29436b488959ecae8ad46ff2))
* **WIP:** detailed env config ([53bf3eb](https://github.com/KotRikD/tosu/commit/53bf3eb9ddfbc66926cffa6848e8c79c4c9af5c6))


### Bug Fixes

* attempt to fix len 0 at index 0 ([49a08da](https://github.com/KotRikD/tosu/commit/49a08da5fddfcd83b7e665d5ed950db43f786173))
* Empty background path ([0f8379c](https://github.com/KotRikD/tosu/commit/0f8379cb1a48013ccd622d6b96c9217b8abe918b))
* Fix startup issues with beatmap folder ([3a592b6](https://github.com/KotRikD/tosu/commit/3a592b6ee2f2d803837c393600eedc9501cdb932))
* graph length for dt/ht ([d821a29](https://github.com/KotRikD/tosu/commit/d821a295046a14e953976b9f8f5a30532ed63b15))
* Incorrect graph offset + add missing points to graph ([b43b621](https://github.com/KotRikD/tosu/commit/b43b62129572eed985827e9b4756c51f2e6791f2))
* Make folders path gosu compatible ([#39](https://github.com/KotRikD/tosu/issues/39)) ([5409099](https://github.com/KotRikD/tosu/commit/540909960b6e338b7af411c89a443d4f5ff44f81))
* memory leak + tournament client ([ba8edbf](https://github.com/KotRikD/tosu/commit/ba8edbfe3e270c56572a15c2004fbd01f8ba17c0))
* mit x 2021 ([57664c7](https://github.com/KotRikD/tosu/commit/57664c7fe0fc6046c5f7ee85c8c009e50b2ca85a))
* Place .env in the same directory as executable ([df14e91](https://github.com/KotRikD/tosu/commit/df14e91709de36d450c64ee6054e20b5b4f72804))
* Remove NM name from mods str ([0957b58](https://github.com/KotRikD/tosu/commit/0957b583363f512f8b12be14e9b19c1c9eb02a39))
* remove unzipper from main repo ([a974ddf](https://github.com/KotRikD/tosu/commit/a974ddfff5753791331cfd6405ee2f3d4b2e4214))
* Reset pp data on retry + enhance ([139cc2d](https://github.com/KotRikD/tosu/commit/139cc2df11b387eadb49a0daebb515d6f94f81ba))
* round bpm & multiple it by speedRate (DT/HT) ([5dc8f7a](https://github.com/KotRikD/tosu/commit/5dc8f7a28fe808b5258b8b6fcbb8ecfa56c6454c))
* use wLogger instead of console ([5a571cf](https://github.com/KotRikD/tosu/commit/5a571cf0f4f6d284a82c43c5f7ce1552dd52d419))

### [1.8.1](https://github.com/KotRikD/tosu/compare/v1.8.0...v1.8.1) (2024-01-10)


### Bug Fixes

* fix import ([#36](https://github.com/KotRikD/tosu/issues/36)) ([d2e3bba](https://github.com/KotRikD/tosu/commit/d2e3bba7206bc2b32a77578c204598244c155f66))

## [1.8.0](https://github.com/KotRikD/tosu/compare/v1.7.0...v1.8.0) (2024-01-08)


### Features

* autoupdater ([#31](https://github.com/KotRikD/tosu/issues/31)) ([1b1efd7](https://github.com/KotRikD/tosu/commit/1b1efd745ee3a82f3d7bcc732bff533208a45ecc))


### Bug Fixes

* move call to body ([93a8267](https://github.com/KotRikD/tosu/commit/93a82679daa402fede932aa11103cfa74ab12ac0))
* now i understand how it packs this ([4306827](https://github.com/KotRikD/tosu/commit/4306827d7919b565007f735b3e752c53a37b1935))
* small fix on pattern ([c0e541d](https://github.com/KotRikD/tosu/commit/c0e541d863016706d6afdd89b13d2fb6b27e0ddc))
* update pattern for current skin ([deed3cf](https://github.com/KotRikD/tosu/commit/deed3cfd7a574675264fb98a1a751eb6f12c0ac9))

## [1.8.0](https://github.com/KotRikD/tosu/compare/v1.7.0...v1.8.0) (2024-01-08)


### Features

* autoupdater ([#31](https://github.com/KotRikD/tosu/issues/31)) ([1b1efd7](https://github.com/KotRikD/tosu/commit/1b1efd745ee3a82f3d7bcc732bff533208a45ecc))


### Bug Fixes

* move call to body ([93a8267](https://github.com/KotRikD/tosu/commit/93a82679daa402fede932aa11103cfa74ab12ac0))
* small fix on pattern ([c0e541d](https://github.com/KotRikD/tosu/commit/c0e541d863016706d6afdd89b13d2fb6b27e0ddc))
* update pattern for current skin ([deed3cf](https://github.com/KotRikD/tosu/commit/deed3cfd7a574675264fb98a1a751eb6f12c0ac9))


## [1.7.0](https://github.com/KotRikD/tosu/compare/v1.6.0...v1.7.0) (2023-12-21)


### Features

* pass name to buildResult ([a57365e](https://github.com/KotRikD/tosu/commit/a57365ebd604c14f3a03bbfbbf49d7bc75a735e0))

## [1.6.0](https://github.com/KotRikD/tosu/compare/v1.5.0...v1.6.0) (2023-12-20)


### Features

* make overlay static more beautiful ([#25](https://github.com/KotRikD/tosu/issues/25)) ([f145a57](https://github.com/KotRikD/tosu/commit/f145a57d009df482a733e20fee2fce7cb7fd8904))
* userProfile reading ([#29](https://github.com/KotRikD/tosu/issues/29)) ([22ec473](https://github.com/KotRikD/tosu/commit/22ec47356d16805e139901950924a0b8fcd2bb92))


### Bug Fixes

* cors are broken ([#28](https://github.com/KotRikD/tosu/issues/28)) ([77f4e85](https://github.com/KotRikD/tosu/commit/77f4e85bf66366ee197ba769b6743a00b33fe6ae))
* if user not connected, dont update it ([318f30f](https://github.com/KotRikD/tosu/commit/318f30f1801e58a8911eae8fbd615a54c9e4e277))
* little json improvments ([#26](https://github.com/KotRikD/tosu/issues/26)) ([78033e9](https://github.com/KotRikD/tosu/commit/78033e9ddd280b32bd7e47d19132094a510f8ecb))
* reset pp values after joining songSelect ([7e11723](https://github.com/KotRikD/tosu/commit/7e11723d916274e667e17fe0302385302f340817))

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
