import { supabase } from '../../app/core/supabase.js';

const form = document.getElementById('loginForm');
const message = document.getElementById('loginMessage');

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) location.href = './dashboard.html';
}

function setMessage(text, type = 'notice') {
  message.className = type;
  message.textContent = text;
  message.classList.remove('hidden');
}

checkSession();

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  setMessage('Memproses login...', 'notice');

  const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});


  if (error) {
    setMessage(error.message || 'Login gagal.', 'error');
    return;
  }

  if (!data.session) {
    setMessage('Session tidak ditemukan.', 'error');
    return;
  }

  location.href = './dashboard.html';
});
