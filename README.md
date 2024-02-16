<p align="center">
  <img alt="Version" src="https://img.shields.io/github/release/KotRikD/tosu.svg?style=for-the-badge" />
  <img src="https://img.shields.io/badge/node-%3E%3D18.14.2-blue.svg?style=for-the-badge&logo=node.js&logoColor=white" />
  <a href="https://github.com/KotRikD/tosu#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg?style=for-the-badge" />
  </a>
  <a href="https://github.com/KotRikD/tosu/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg?style=for-the-badge" />
  </a>
  <a href="https://github.com/KotRikD/tosu/blob/master/LICENSE" target="_blank">
    <img alt="License: GPL--3.0" src="https://img.shields.io/github/license/KotRikD/tosu?style=for-the-badge" />
  </a>
  <a href="https://twitter.com/kotrik0" target="_blank">
    <img alt="Twitter: kotrik0" src="https://img.shields.io/badge/kotrik0-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" />
  </a>
</p>


<h1 align="center">Welcome to tosu 👋</h1>
<div align="center">
<img src=".github/logo.png" />
</div>

<br>

```text
Eponymous software for reading osu! memory, accounting for most of gosumemory's issues
```

<br>

<div  align="center">
<a href="https://github.com/KotRikD/tosu/releases/latest"><img src=".github/btn-dl.jpg" /></a>
<a href="#"><img src=".github/btn-pp.jpg" /></a>
<a href="https://discord.gg/WX7BTs8kwh"><img src=".github/btn-ds.jpg" /></a>
</div>


Instruction
---
1. Download [tosu](https://github.com/KotRikD/tosu/releases/latest)
2. Extract tosu.exe to a `Folder`
3. Inside `Folder` create `static` folder (if it's doesn't already)
4. Download the [PP Counters](https://github.com/l3lackShark/static) unpack it to `static` folder. After that you should be ready to go!
5. OR You can place your `pp counter` to `static` folder directory, or create sub folder `/static/{your_counter_name}`
6. Your counter folder should have this path for index.html `/static/{your_counter_name}/index.html` or `/static/index.html` (if you have only one counter, and want to place it in root folder)
7. Run `tosu.exe`, and it will create `tosu.env`, it's a file for tosu settings, you can tweak it how you want
8. Have fun!

---

<br>

Features
---
- [x] All _**Gamemodes**_ are supported
- [x] Gosumemory _**compatible**_ api
- [X] Brand _**new api**_ for websocket
- [x] _**In-game**_ overlay (based on gosumemory closed overlay injection)
- [x] _**Available**_ websocket data:
  - Settings _**(limited atm)**_
  - Gameplay data
  - User ingame data
  - Beatmap data
  - Session _**(Work in progress)**_
  - Multiple graphs for different skill sets _**(aim, speed, etc)**_
    - Extended starrating stats _**(per mode)**_ 
  - Leaderboards list _**(array)**_
  - Folders paths and Files names
  - Direct paths to files
  - Result screen _**(achieved rank & date are missing)**_
  - Tourney data _**(not tested, yet)**_
- [X] LOW CPU USAGE (I actually checked, this thing has a much lower memory recoil than the gosu)
---

<br>

In-game overlay
---
- To enable it, you need to edit `tosu.env`, and turn on `ENABLE_GOSU_OVERLA=true` (make it equal `true`)
---

<br>

Routes
---
- `/` - List of all counters you have
- `/json - Example of `/ws` response
- `/json/v2` - Example of `/websocket/v2` response
- `/ws` - [response example](https://github.com/KotRikD/tosu/releases/latest)
- `/websocket/v2` - [response example](https://github.com/KotRikD/tosu/releases/latest)
- `/Songs/{path}` - Show content of the file, or show list of files for a folder
- `/files/beatmap/{path}` - same as `/Songs/{path}`
- `/files/skin/{path}` - similar as `/files/beatmap/{path}`, but for a skin
---


<br />

Support
---
- Give a ⭐️ if this project helped you!
- If you need help setting up this program or have any suggestions/comissions, feel free to go to the [discord](https://discord.gg/WX7BTs8kwh) channel above in the `🔵 tosu` section
---

<br />

## Author
👤 **Mikhail Babynichev**
* Website: http://kotrik.ru
* Twitter: [@kotrik0](https://twitter.com/kotrik0)
* Github: [@KotRikD](https://github.com/KotRikD)

Special thanks to [@xxCherry](https://github.com/xxCherry), for providing memory reading library

<br />

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/KotRikD/tosu/issues). You can also take a look at the [contributing guide](https://github.com/KotRikD/tosu/blob/master/CONTRIBUTING.md).

<br />

## 📝 License

Copyright © 2023 [Mikhail Babynichev](https://github.com/KotRikD).<br />
This project is [GPL--3.0](https://github.com/KotRikD/tosu/blob/master/LICENSE) licensed.
