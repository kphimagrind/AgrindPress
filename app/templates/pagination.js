// app/templates/pagination.js

const Pagination = {
  render(halaman, total, itemsPerPage, onGanti) {
    const totalHalaman = Math.ceil(total / itemsPerPage);
    if (totalHalaman <= 1) return '';

    let items = '';
    for (let i = 1; i <= totalHalaman; i++) {
      items += `<button
        class="page-btn ${i === halaman ? 'aktif' : ''}"
        data-hal="${i}"
      >${i}</button>`;
    }

    const html = `
      <div class="pagination">
        <button class="page-btn prev" data-hal="${halaman - 1}" ${halaman === 1 ? 'disabled' : ''}>‹</button>
        ${items}
        <button class="page-btn next" data-hal="${halaman + 1}" ${halaman === totalHalaman ? 'disabled' : ''}>›</button>
      </div>`;

    // Bind events setelah insert ke DOM
    setTimeout(() => {
      document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const hal = parseInt(btn.dataset.hal);
          if (!isNaN(hal) && hal >= 1 && hal <= totalHalaman) onGanti(hal);
        });
      });
    }, 0);

    return html;
  }
};

export default Pagination;
