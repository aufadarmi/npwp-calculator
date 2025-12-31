/* ================================
   HELPER FUNCTIONS
================================ */

function formatRupiah(num) {
  if (!Number.isFinite(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}


function formatInputRupiah(input) {
  // Menghapus karakter selain angka
  let value = input.value.replace(/\D/g, '');
  // Format menjadi ribuan
  input.value = value ? Number(value).toLocaleString('id-ID') : '';
}

function show(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function hide(id) {
  document.getElementById(id)?.classList.add('hidden');
}

/* ================================
   CORE TAX LOGIC
================================ */

function calculatePPh(pkp) {
  if (pkp <= 0) return 0;

  // Struktur tarif pajak progresif terbaru (UU HPP)
  const layers = [
    { limit: 60000000, rate: 0.05 },
    { limit: 190000000, rate: 0.15 }, // Sisa dari 250jt - 60jt
    { limit: 250000000, rate: 0.25 }, // Sisa dari 500jt - 250jt
    { limit: 4500000000, rate: 0.30 }, // Sisa dari 5M - 500jt
    { limit: Infinity, rate: 0.35 }
  ];

  let remaining = pkp;
  let tax = 0;
  for (const layer of layers) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, layer.limit);
    tax += taxable * layer.rate;
    remaining -= taxable;
  }
  return Math.round(tax);
}

function breakdownPPhDetailed(pkp) {
  if (pkp <= 0) {
    return { html: 'PKP ≤ 0 → Tidak ada PPh terutang<br>', sumText: 'Rp 0', total: 0 };
  }

  const layers = [
    { limit: 60000000, rate: 0.05 },
    { limit: 190000000, rate: 0.15 },
    { limit: 250000000, rate: 0.25 },
    { limit: 4500000000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 }
  ];

  let remaining = pkp;
  let totalTax = 0;
  let html = '';
  let tierTaxes = [];

  for (const layer of layers) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, layer.limit);
    const tax = Math.round(taxable * layer.rate);

    html += `${layer.rate * 100}% × ${formatRupiah(taxable)} = <strong>${formatRupiah(tax)}</strong><br>`;
    tierTaxes.push(formatRupiah(tax));
    totalTax += tax;
    remaining -= taxable;
  }

  return { html, sumText: tierTaxes.join(' + '), total: totalTax };
}

/* ================================
   GLOBAL STATE & MAIN CALCULATION
================================ */

let lastCalculationData = null;

function calculate() {

    // RESET state lama
  document.getElementById('phmt-wrapper').innerHTML = '';
  closeSidebar();
  
  // Ambil value dan hapus titik (separator ribuan)
  const ih = Number(document.getElementById('incomeHusband').value.replace(/\./g, '') || 0);
  const iw = Number(document.getElementById('incomeWife').value.replace(/\./g, '') || 0);
  const ptkpH = Number(document.getElementById('ptkpHusband').value);
  const ptkpW = Number(document.getElementById('ptkpWife').value);

  // ✅ EDGE CASE: tidak ada penghasilan
  if (ih === 0 && iw === 0) {
    hide('awareness-card');
    hide('phmt-wrapper');
    hide('tax-planning-cta');
    hide('output');
    lastCalculationData = null;
    return;
  }

  const pkpH = Math.max(0, ih - ptkpH);
  const pkpW = Math.max(0, iw - ptkpW);

  const pphH = calculatePPh(pkpH);
  const pphW = calculatePPh(pkpW);

  // Simulasi Gabungan (PH/MT)
  const totalIncome = ih + iw;
  const totalPTKP = ptkpH + ptkpW;
  const pphCombined = calculatePPh(Math.max(0, totalIncome - totalPTKP));

  lastCalculationData = {
    ih,
    iw,
    ptkpHusband: ptkpH,
    ptkpWife: ptkpW,
    pphHusbandPaid: pphH,
    pphWifePaid: pphW,
    pphCombined
  };

  renderBaselineResult(pphH, pphW);

  // Reset tampilan flow
  show('awareness-card');
  hide('explanation-panel');
  hide('phmt-wrapper');
  hide('tax-planning-cta');
}


/* ================================
   UI RENDERING
================================ */

function renderBaselineResult(pphH, pphW) {
  const output = document.getElementById('output');
  output.innerHTML = `
    <table>
      <tr>
        <th></th>
        <th class="col-header">Suami</th>
        <th class="col-header">Istri</th>
      </tr>
      <tr>
        <th>Pajak Penghasilan Setahun</th>
        <td class="clickable" onclick="showDetailPPh('Suami', ${lastCalculationData.ih}, ${lastCalculationData.ptkpHusband})">
          ${formatRupiah(pphH)}
        </td>
        <td class="clickable" onclick="showDetailPPh('Istri', ${lastCalculationData.iw}, ${lastCalculationData.ptkpWife})">
          ${formatRupiah(pphW)}
        </td>
      </tr>
    </table>
  `;
  output.style.display = 'block';
}

function renderPHMT() {
  if (!lastCalculationData) return;

  const data = lastCalculationData;
  const totalIncome = data.ih + data.iw;
  const totalPTKP = data.ptkpHusband + data.ptkpWife;

  const pkpCombined = Math.max(0, totalIncome - totalPTKP);
  const breakdown = breakdownPPhDetailed(pkpCombined);

  const allocSuami = totalIncome > 0
    ? Math.round((data.ih / totalIncome) * breakdown.total)
    : 0;

  const allocIstri = totalIncome > 0
    ? Math.round((data.iw / totalIncome) * breakdown.total)
    : 0;

  // STEP 6 – Selisih Pajak (Potensi Kurang Bayar)
  const selisihSuami = allocSuami - data.pphHusbandPaid;
  const selisihIstri = allocIstri - data.pphWifePaid;

  document.getElementById('phmt-wrapper').innerHTML = `
    <table>
      <tr>
        <th></th>
        <th class="col-header">Suami</th>
        <th class="col-header">Istri</th>
      </tr>

      <tr>
        <th class="risk-header">Potensi Kurang Bayar</th>

        <td class="clickable risk-amount" onclick="showDetailPHMTSuami()">
          ${formatRupiah(selisihSuami)}
        </td>

        <td class="clickable risk-amount" onclick="showDetailPHMTIstri()">
          ${formatRupiah(selisihIstri)}
        </td>
      </tr>
    </table>
  `;
}




/* ================================
   SIDEBAR & MODAL CONTROL
================================ */

function openSidebar(title, content) {
  document.getElementById('sidebarTitle').innerHTML = title;
  document.getElementById('sidebarContent').innerHTML = content;
  document.getElementById('sidebar').classList.add('active');
  document.getElementById('sidebarOverlay').classList.add('active');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('active');
  document.getElementById('sidebarOverlay').classList.remove('active');
}

function showDetailPPh(label, income = 0, ptkp = 0) {
  const pkp = Math.max(0, income - ptkp);
  const breakdown = breakdownPPhDetailed(pkp);

  openSidebar(
    `Detail PPh 21 ${label}`,
    `
      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 1 – Penghasilan Neto</span>
        <strong>${formatRupiah(income)}</strong>
      </div>

      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 2 – PTKP</span>
        <strong>${formatRupiah(ptkp)}</strong>
      </div>

      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 3 – Penghitungan PKP</span>
        <p>PKP = ${formatRupiah(income)} - ${formatRupiah(ptkp)}</p>
        <strong>PKP = ${formatRupiah(pkp)}</strong>
      </div>

      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 4 – Tarif Progresif</span>
        <p>${pkp > 0 ? breakdown.html : 'Tidak ada PPh terutang'}</p>
      </div>

      <div class="sidebar-item" style="border-top: 2px solid var(--border-soft); margin-top: 15px; padding-top: 15px;">
        <span class="sidebar-step-title">Total PPh 21 Setahun</span>
        <p>${pkp > 0 ? breakdown.sumText : '0'}</p>
        <strong>${formatRupiah(breakdown.total)}</strong>
      </div>
    `
  );
}

function showDetailPHMTSuami() {
  if (!lastCalculationData) return;
  const data = lastCalculationData;

  const totalIncome = data.ih + data.iw;
  const totalPTKP = data.ptkpHusband + data.ptkpWife;
  const pkpCombined = Math.max(0, totalIncome - totalPTKP);
  const breakdown = breakdownPPhDetailed(pkpCombined);

  const allocSuami = Math.round((data.ih / totalIncome) * breakdown.total);
  const selisihSuami = allocSuami - data.pphHusbandPaid;

  openSidebar(
    'Detail Simulasi PH/MT – Suami',
    `
      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 1 – Pendapatan Keluarga</span>
        <strong>${formatRupiah(totalIncome)}</strong>
      </div>

      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 2 – PTKP Gabungan</span>
        <strong>${formatRupiah(totalPTKP)}</strong>
      </div>

      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 3 – PKP Gabungan</span>
        <strong>${formatRupiah(pkpCombined)}</strong>
      </div>

      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 4 – Pajak Gabungan Keluarga (Tarif Progresif)</span>
        <p>
          ${pkpCombined > 0 ? breakdown.html : 'Tidak ada PPh terutang'}
        </p>
        <strong style="display:block; margin-top:8px;">
          Total Pajak Keluarga: ${formatRupiah(breakdown.total)}
        </strong>
      </div>


      <div class="sidebar-item" style="border-top:2px solid var(--border-soft); margin-top:15px; padding-top:15px;">
        <span class="sidebar-step-title">Step 5 – Alokasi Proporsional Suami</span>
        <p>(${formatRupiah(data.ih)} / ${formatRupiah(totalIncome)}) × ${formatRupiah(breakdown.total)}</p>
        <strong>${formatRupiah(allocSuami)}</strong>
      </div>

      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 6 – Selisih Pajak Suami</span>
        <p>
          ${formatRupiah(allocSuami)} − ${formatRupiah(data.pphHusbandPaid)}
        </p>
        <strong>${formatRupiah(selisihSuami)}</strong>
      </div>

    `
  );
}

function showDetailPHMTIstri() {
  if (!lastCalculationData) return;
  const data = lastCalculationData;

  const totalIncome = data.ih + data.iw;
  const totalPTKP = data.ptkpHusband + data.ptkpWife;
  const pkpCombined = Math.max(0, totalIncome - totalPTKP);
  const breakdown = breakdownPPhDetailed(pkpCombined);

  const allocIstri = Math.round((data.iw / totalIncome) * breakdown.total);
  const selisihIstri = allocIstri - data.pphWifePaid;

  openSidebar(
    'Detail Simulasi PH/MT – Istri',
    `
      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 1 – Pendapatan Keluarga</span>
        <strong>${formatRupiah(totalIncome)}</strong>
      </div>

      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 2 – PTKP Gabungan</span>
        <strong>${formatRupiah(totalPTKP)}</strong>
      </div>

      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 3 – PKP Gabungan</span>
        <strong>${formatRupiah(pkpCombined)}</strong>
      </div>

      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 4 – Pajak Gabungan (Tarif Progresif)</span>
        <p>
          ${pkpCombined > 0 ? breakdown.html : 'Tidak ada PPh terutang'}
        </p>
        <strong style="display:block; margin-top:8px;">
          Total Pajak Keluarga: ${formatRupiah(breakdown.total)}
        </strong>
      </div>


      <div class="sidebar-item" style="border-top:2px solid var(--border-soft); margin-top:15px; padding-top:15px;">
        <span class="sidebar-step-title">Step 5 – Alokasi Proporsional Istri</span>
        <p>(${formatRupiah(data.iw)} / ${formatRupiah(totalIncome)}) × ${formatRupiah(breakdown.total)}</p>
        <strong>${formatRupiah(allocIstri)}</strong>
      </div>

      <div class="sidebar-item">
        <span class="sidebar-step-title">Step 6 – Selisih Pajak Istri</span>
        <p>
          ${formatRupiah(allocIstri)} − ${formatRupiah(data.pphWifePaid)}
        </p>
        <strong>${formatRupiah(selisihIstri)}</strong>
      </div>

    `
  );
}



function showAppreciation(totalTax) {
  document.getElementById('apprTotalTax').innerText = formatRupiah(totalTax);
  const facts = [
    ['Pendidikan', 'Membiayai operasional sekolah negeri'],
    ['Kesehatan', 'Mendukung layanan kesehatan masyarakat'],
    ['Infrastruktur', 'Membantu pembangunan fasilitas publik']
  ];
  const fact = facts[Math.floor(Math.random() * facts.length)];
  document.getElementById('funfactTitle').innerText = fact[0];
  document.getElementById('funfactDesc').innerText = fact[1];

  // Pastikan class CSS sesuai (menggunakan 'active' atau 'show')
  document.getElementById('appreciationModal').classList.add('active');
}

function closeAppreciation() {
  document.getElementById('appreciationModal').classList.remove('active');
}

function calculateWithAppreciation() {
  calculate();
  if (lastCalculationData) {
    const total = lastCalculationData.pphHusbandPaid + lastCalculationData.pphWifePaid;
    showAppreciation(total);
  }
}

/* ================================
   EVENT LISTENERS (STATE BINDING)
=============================== */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-show-explanation')?.addEventListener('click', () => {
    show('explanation-panel');
  });

  document.getElementById('btn-show-phmt')?.addEventListener('click', () => {
    renderPHMT();
    show('phmt-wrapper');
    show('tax-planning-cta');
  });
});