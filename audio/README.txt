把 BGM 换成 Leoseven - UNICUBE
================================

目标曲目：Leoseven - UNICUBE

由于版权原因，游戏不会附带这首曲子，需要你自己准备音频文件
（例如从你已购买 / 已获授权的渠道下载），然后放进本文件夹。

可用的文件名（任选其一，大小写都认）：

    unicube.mp3          UNICUBE.mp3         UniCube.mp3
    leoseven-unicube.mp3 Leoseven-UNICUBE.mp3 leoseven_unicube.mp3
    bgm.mp3

也支持同名的 .ogg / .wav / .m4a。游戏会自动按
「文件名顺序 × mp3 → ogg → wav → m4a」逐个尝试，找到就用它循环播放，
并停止内置合成曲；找不到时自动回退到内置合成曲（控制台会给出提示）。

放好后刷新页面即可。音量、静音、暂停时的音乐压低都会继续生效。

注意：
- 请使用你有权使用的音频文件；游戏本身不附带任何第三方音乐。
- 通过 `python -m http.server` 之类的本地服务器打开时才能读取该文件；
  直接双击 index.html（file://）时浏览器可能拦截本地音频读取，此时会用内置合成曲。
- 想临时换别的曲子，直接改文件名或替换文件即可，无需修改代码。
- 控制台执行 `GameAudio.tryLoadCustomBgm()` 可以手动重新尝试加载；
  `GameAudio.customBgm` 为真表示自定义曲目已接管。