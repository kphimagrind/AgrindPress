// app/modules/kirimPesan.js
// Mengirim pesan ke kphimagrind@gmail.com via Formspree

import Navbar from '../components/navbar.js';
import Footer from '../components/footer.js';

// Ganti FORMSPREE_ID dengan kode dari formspree.io setelah daftar
// Cara: daftar di https://formspree.io → buat form → salin ID (contoh: xpwzlkqv)
const FORMSPREE_ID = 'GANTI_DENGAN_ID_FORMSPREE';
const ENDPOINT = `https://formspree.io/f/${FORMSPREE_ID}`;

async function init() {
  await Navbar.render('navbar');
  await Footer.render('footer');

  document.getElementById('kirim-btn').addEventListener('click', async () => {
    const nama   = document.getElementById('nama').value.trim();
    const email  = document.getElementById('email').value.trim();
    const subjek = document.getElementById('subjek').value.trim();
    const pesan  = document.getElementById('pesan').value.trim();
    const status = document.getElementById('form-status');

    if (!nama || !subjek || !pesan) {
      status.textContent = 'Nama, subjek, dan pesan wajib diisi.';
      status.className = 'form-status gagal';
      return;
    }

    document.getElementById('kirim-btn').disabled = true;
    document.getElementById('kirim-btn').textContent = 'Mengirim...';

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ nama, email, subjek, pesan })
      });

      if (res.ok) {
        status.textContent = 'Pesan berhasil dikirim! Terima kasih atas aspirasimu.';
        status.className = 'form-status sukses';
        ['nama','email','subjek','pesan'].forEach(id =>
          document.getElementById(id).value = ''
        );
      } else {
        throw new Error('Server error');
      }
    } catch {
      status.textContent = 'Gagal mengirim. Coba lagi atau hubungi langsung: kphimagrind@gmail.com';
      status.className = 'form-status gagal';
    }

    document.getElementById('kirim-btn').disabled = false;
    document.getElementById('kirim-btn').textContent = 'Kirim Pesan';
  });
}

init();
