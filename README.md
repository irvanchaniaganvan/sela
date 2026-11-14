# Sela

> 900 km, satu ruang.

Sela adalah ruang kecil untuk pasangan LDR — Batam dan Jakarta, satu zona waktu.
Satu aplikasi, tiga cara untuk tetap dekat.

## Fitur

| Tab | Isi | Status |
|---|---|---|
| **Kapsul Waktu** | Tulis pesan, terkunci sampai tanggal yang dipilih | Menunggu data online |
| **Kuis** | "Seberapa Kenal Kamu" — berdua bisa membuat kuis, lihat skor pasangan | Menunggu data online |
| **Roulette** | Ide acak untuk malam ini, daftarnya bisa ditambah berdua | ✅ Jalan (masih lokal) |

## Yang sudah jalan

- Kerangka aplikasi dengan tiga tab dan navigasi papan ketik
- Roulette: putar ide, tambah, hapus, kembalikan daftar awal
- Daftar ide tersimpan di `localStorage` (`sela:roulette-options:v1`)
- Tema terang/gelap mengikuti pengaturan perangkat
- Bisa dipasang ke layar utama lewat manifest + service worker

## Rencana

1. **Setup Firebase + login** — dua akun, email & password
2. **Roulette online** — daftar ide tersinkron berdua
3. **Kuis** — buat, jawab, lihat skor
4. **Kapsul Waktu** — tulis, kunci, buka
5. **Polish + PWA** — ikon, offline, pengalaman pasang di HP

## Teknologi

- HTML, CSS, JavaScript murni (tanpa framework)
- Firebase Firestore + Authentication (tahap berikutnya)
- GitHub Pages untuk hosting

## Menjalankan di lokal

Buka `index.html` langsung di browser sudah cukup untuk melihat tampilan.
Untuk mencoba service worker, jalankan server statis sederhana:

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
├── assets/
│   ├── css/style.css
│   ├── icons/
│   └── js/
│       ├── app.js
│       └── roulette.js
└── README.md
```

## Catatan

Data masih tersimpan di masing-masing perangkat. Sinkronisasi berdua
menyusul setelah Firebase disiapkan.
