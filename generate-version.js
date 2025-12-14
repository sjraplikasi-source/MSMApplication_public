// generate-version.js
import fs from 'fs';

// Kita pakai Timestamp sebagai penanda versi (pasti unik setiap detik)
const version = Date.now();

const versionData = {
  version: version,
  buildDate: new Date().toLocaleString()
};

// Tulis ke folder public (agar bisa diakses via browser)
// Pastikan folder 'public' ada. Jika pakai Vite biasanya sudah ada.
console.log('Generating version.json with version:', version);
fs.writeFileSync('./public/version.json', JSON.stringify(versionData));