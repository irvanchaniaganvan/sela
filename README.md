# Sela

> 900 km, satu ruang.

Sela adalah ruang kecil untuk pasangan LDR — Batam dan Jakarta, satu zona waktu.
Satu aplikasi, tiga cara untuk tetap dekat.

## Fitur

| Tab | Isi | Status |
|---|---|---|
| **Kapsul Waktu** | Tulis pesan, terkunci sampai tanggal yang dipilih | Menunggu tahap berikutnya |
| **Kuis** | "Seberapa Kenal Kamu" — berdua bisa membuat kuis, lihat skor pasangan | Menunggu tahap berikutnya |
| **Roulette** | Ide acak untuk malam ini, daftarnya bisa ditambah berdua | ✅ Jalan, tersinkron |

## Yang sudah jalan

- Login email & password — hanya dua akun yang dibuat manual di Firebase
- Roulette: putar ide, tambah, hapus, kembalikan daftar awal
- Daftar ide tersimpan di Firestore (`roulette/main`) dan langsung sinkron di dua perangkat
- Tema terang/gelap mengikuti pengaturan perangkat
- Bisa dipasang ke layar utama lewat manifest + service worker

## Rencana

1. **Kuis** — buat, jawab, lihat skor
2. **Kapsul Waktu** — tulis, kunci, buka
3. **Polish + PWA** — ikon, offline, pengalaman pasang di HP

## Teknologi

- HTML, CSS, JavaScript murni (tanpa framework)
- Firebase Authentication + Cloud Firestore
- Firebase modular SDK 13.3.0 dari CDN
- GitHub Pages untuk hosting

## Setup Firebase

Project: `sela-9c40f`

### 1. Dua akun

Buat akun manual di **Firebase Console → Authentication → Users → Add user**:

- Email + password untuk kamu
- Email + password untuk pasangan

Tidak ada halaman daftar di aplikasi — memang hanya untuk kalian berdua.

### 2. Aturan Firestore

Salin `firestore.rules.example` menjadi `firestore.rules`, ganti dua email
contoh dengan email akun kalian, lalu tempel isinya ke:

**Firebase Console → Firestore → Rules → Publish**

File `firestore.rules` sengaja di-ignore oleh Git supaya email kalian tidak
ikut ter-commit ke repo publik.

### 3. Config web

`assets/js/firebase-config.js` berisi config web Firebase. Nilai ini memang
boleh terlihat publik — keamanan data dijaga oleh Authentication dan aturan
Firestore, bukan oleh config ini.

## Menjalankan di lokal

Jangan buka lewat `file://` karena aplikasi memakai ES module dan Firebase.
Jalankan server statis sederhana:

```bash
python -m http.server 8000
```

Lalu buka `http://localhost:8000`.

## Struktur

```
sela/
├── index.html
├── manifest.json
├── sw.js
├── firestore.rules.example
├── assets/
│   ├── css/style.css
│   ├── icons/
│   └── js/
│       ├── main.js
│       ├── app.js
│       ├── auth.js
│       ├── firebase.js
│       ├── firebase-config.js
│       └── roulette.js
└── README.md
```

## Catatan

Situs ini `noindex` dan hanya berisi ruang untuk dua orang.
