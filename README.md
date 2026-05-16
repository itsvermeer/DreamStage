# 💃 DreamStage – a Rhythm Dance

A browser‑based rhythm dance game inspired by the classic **Audition Online**, built with **Three.js**, **VRM avatars**, and **Mixamo animations**.  
Choose your Idol, hit the arrow keys to the beat, and watch them dance in stunning 3D.

---

## ✨ Features

- 🎵 **Random playlist** – 11 AI‑generated K‑pop tracks with adjustable BPM sync.
- 🕺 **7 playable characters** (Ruru, Canny, Riri, Asa, Leo, Marco, Jin) each with a unique buff.
- 💃 **Mixamo dance animations** – each character has their own dance (FBX), and Jin cycles through 5 routines.
- 🎨 **Full‑screen 3D stage** – transparent WebGL canvas, animated GLB menu background, random JPEG backdrops.
- 🎯 **Rhythm‑game lanes** – 4‑lane arrow system with Perfect/Great/Good/Bad/Miss judgements.
- 🔊 **SFX & music** – click sounds, beat‑synced audio engine, volume control, SFX toggle.
- 🏆 **Scoring & combo** – combo multiplier, character buffs, end‑of‑song results with grade (S–C).
- 🌐 **Multiplayer placeholder** – locked button with “coming soon” popup.

---

## 🛠 Tech Stack

- [Three.js](https://threejs.org/) – 3D rendering
- [@pixiv/three‑vrm](https://github.com/pixiv/three-vrm) – VRM avatar loading
- FBX animation retargeting (Mixamo → VRM humanoid)
- Web Audio API – beat‑sync engine
- Vanilla JavaScript (ES modules, no bundler)
- HTML/CSS UI overlays

---

## 📁 Project Structure

```
dreamstage/
├── index.html
├── css/
│   └── overlay.css
├── js/
│   ├── main.js
│   ├── beat-sync.js
│   ├── game-logic.js
│   ├── ui-overlay.js
│   ├── animation-loader.js
│   └── vrm-loader.js
├── assets/
│   ├── audio/          # .mp3 files (not included)
│   ├── models/         # .vrm characters (not included)
│   ├── animations/     # .fbx dance files (not included)
│   └── background/     # main.glb, logo.png, icon.png, 1-8.jpg
└── README.md
```

> **Note:** Large binary files (audio, models, animations) are not tracked in this repository.  
> To run the game, you must place your own assets in the corresponding folders.

---

## 🚀 Getting Started

1. **Clone the repository**  
   ```bash
   git clone https://github.com/itsvermeer/DreamStage.git
   cd DreamStage
   ```

2. **Add your assets**  
   Place your `.mp3`, `.vrm`, `.fbx`, and `.jpg` files inside the `assets/` folder as shown in the structure.

3. **Serve the project**  
   Because of browser security (CORS, module imports), you **must** run a local web server.  
   ```bash
   npx serve .
   ```
   Or use VS Code’s **Live Server** extension.  
   **Do not** open `index.html` directly from the file system.

4. **Open in your browser**  
   Navigate to `http://localhost:3000` (or the port shown by your server).

5. **Play**  
   Click **START GAME**, pick a dancer, and hit the arrow keys (← ↑ ↓ →) when the falling notes reach the hit zone.

---

## 🎶 Playlist & BPM

The game plays a random track from the built‑in playlist defined in `js/main.js`.  
To customise, edit the `playlist` array – add your own `.mp3` files with their correct BPM and offset.

---

## 🎮 Characters & Buffs

| Character | Buff              |
|-----------|-------------------|
| Ruru      | +50 Perfect Bonus |
| Canny     | +30 Great Bonus   |
| Riri      | Combo ×1.2        |
| Asa       | Score ×1.2        |
| Leo       | 5 Miss Shields    |
| Marco     | Arrow Speed +     |
| Jin       | Lucky Bonus (20%) |

---

## 🧑‍💻 Credits

- **Game Concept & Development:** Its.vermeer  
- **3D Engine:** Three.js, @pixiv/three‑vrm  
- **Dance Animations:** Mixamo (retargeted for VRM)  
- **Music:** AI‑generated K‑pop tracks  

---

## 📜 License

MIT – free to use, modify, and share.  
© 2026 Its.vermeer

---

**DreamStage** – Bringing rhythm battles to your browser! 🎶💃
```