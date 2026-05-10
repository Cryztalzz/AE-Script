# 🎬 Alztod Shortcuts v1.0

**Alztod Shortcuts** adalah Adobe After Effects Extension (CEP) yang dirancang buat nge-boost workflow editing lu biar makin sat-set. Gak perlu ribet buka menu satu-satu, semua tools penting udah dikumpulin jadi satu panel minimalis.

---

## ✨ Fitur Unggulan

### 🚀 1. Essentials (Main)
* **Quick Comp:** Bikin Composition instan dengan preset rasio 16:9, 4:3, atau 1:1. Otomatis setting Motion Blur (64 samples).
* **Smart Solid:** Bikin Black Solid sekaligus nambahin efek *Fill* cuma sekali klik.
* **Camera 15mm:** Spawn kamera 15mm dengan kalkulasi zoom otomatis.
* **Null + Parent:** Bikin Null Object dan otomatis nge-parent semua layer yang lagi lu pilih.
* **Fast Elements:** Tombol instan buat bikin Text (Center), Adjustment Layer, dan Adjustment Comp.

### 📁 2. Project Manager
* **Auto Organize:** Rapiin *Project Panel* lu otomatis. Semua bakal masuk ke folder `01_COMPS`, `02_ASSETS`, dan `03_AUDIO`. Gak ada lagi aset berantakan!

### ⏳ 3. Timeline & Time Tools
* **Advanced Stagger:** Geser layer berurutan (1, 5, 10 frame, atau nyambung ke ujung clip).
* **Un-Comp:** Bongkar isi Pre-comp balik ke timeline utama dengan posisi waktu yang bener.
* **Pre-Compose Pro:** Opsi Pre-comp yang lebih pinter dengan pilihan *Move All Attributes* dan *Adjust Duration*.
* **Bakar Cache (Purge):** Tombol darurat buat ngebersihin Memory & Disk Cache pas AE udah mulai engap. 🔥

### 🎨 4. FX & Watermark
* **Motion Tile Gen:** Pasang Motion Tile dengan pilihan scale (150, 300, 500) dan fitur *Mirror Edges* otomatis.
* **Smart Watermark:** Generator watermark teks dengan 9 titik posisi (Top-Left, Center, dsb) dan slider scale yang bisa di-update real-time.

---

## 🛠️ Cara Instalasi

1.  **Download/Clone** repo ini.
2.  Pindahkan folder project ke direktori ekstensi Adobe:
    * **Windows:** `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\`
3.  Buka After Effects.
4.  Pergi ke menu **Window > Extensions > AlztodShortcuts**.

> **Note:** Kalau panel gak muncul/blank, pastiin lu udah aktifin `PlayerDebugMode` di Registry/Terminal lewat [ZXP Installer](https://zxpinstaller.com/) atau cara manual.

---

## 💻 Tech Stack
* **Frontend:** HTML5, CSS3 (Custom Dark Theme)
* **Logic:** JavaScript (CSInterface)
* **Engine:** ExtendScript (JSX)

---

Made by **Alztod**
*"Edit lebih cepet, tidur lebih nyenyak."*