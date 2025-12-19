/* =====================    FORMAT INPUT RUPIAH ===================== */
function formatInputRupiah(el) {
  let value = el.value.replace(/\D/g, '');
  el.value = new Intl.NumberFormat('id-ID').format(value);
}

/* =====================    FORMAT RUPIAH ===================== */
function formatRupiah(num) {
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

/* =====================    HITUNG PPH PROGRESIF (UU HPP) ===================== */
function calculatePPh(pkp) {
  if (pkp <= 0) return 0;

  const layers = [
    { limit: 60000000, rate: 0.05 },
    { limit: 190000000, rate: 0.15 },
    { limit: 250000000, rate: 0.25 },
    { limit: 4500000000, rate: 0.30 },
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

/* =====================    BREAKDOWN DETAIL PPH ===================== */
function breakdownPPhDetailed(pkp) {
  if (pkp <= 0) {
    return {
      html: 'PKP ≤ 0 → Tidak ada PPh terutang<br>',
      sumText: '',
      total: 0
    };
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

    html += `
      ${layer.rate * 100}% × ${formatRupiah(taxable)}
      = <strong>${formatRupiah(tax)}</strong><br>
    `;

    tierTaxes.push(formatRupiah(tax));
    totalTax += tax;
    remaining -= taxable;
  }

  return {
    html,
    sumText: tierTaxes.join(' + '),
    total: totalTax
  };
}

/* =====================    SIDEBAR CONTROL ===================== */
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

/* =====================    DETAIL – PPH TERPISAH ===================== */
function showDetailPPh(label, income, ptkp) {
  const pkp = Math.max(0, income - ptkp);
  const breakdown = breakdownPPhDetailed(pkp);

  openSidebar(
    `Detail PPh 21 ${label}`,
    `
      <strong>Step 1 – Penghasilan Neto</strong><br>
      ${formatRupiah(income)}<br><br>

      <strong>Step 2 – PTKP</strong><br>
      ${formatRupiah(ptkp)}<br><br>

      <strong>Step 3 – Penghitungan PKP</strong><br>
      PKP = Penghasilan Neto − PTKP<br>
      PKP = ${formatRupiah(income)} − ${formatRupiah(ptkp)}<br>
      <strong>PKP = ${formatRupiah(pkp)}</strong><br><br>

      <strong>Step 4 – Perhitungan Tarif Progresif</strong><br>
      ${pkp <= 60000000 ? '' : breakdown.html}<br>

      <strong>Total PPh 21 Setahun</strong><br>
      ${breakdown.sumText}<br>
      <strong>= ${formatRupiah(breakdown.total)}</strong>
    `
  );
}

/* =====================    DETAIL – PH/MT (GABUNG) ===================== */
function showDetailPHMT(data) {
  // Hitung total penghasilan dan PTKP
  const totalIncome = (data.ih || 0) + (data.iw || 0);
  const totalPTKP = (data.ptkpHusband || 0) + (data.ptkpWife || 0);

  // PKP gabungan
  const pkpCombined = Math.max(totalIncome - totalPTKP, 0);

  // Breakdown PPh progresif gabungan
  const breakdown = pkpCombined > 0 ? breakdownPPhDetailed(pkpCombined) : { html: '', total: 0 };
  const totalPPh = breakdown.total;

  // Alokasi PPh suami & istri (proporsional)
  const pphHusband = totalIncome > 0 ? Math.round((data.ih / totalIncome) * totalPPh) : 0;
  const pphWife = totalIncome > 0 ? totalPPh - pphHusband : 0;

  // Kurang / lebih bayar, fallback 0
  const kurangBayarHusband = pphHusband - (data.pphHusbandPaid || 0);
  const kurangBayarWife = pphWife - (data.pphWifePaid || 0);

  // Hanya tampilkan Step 4–6 jika PKP gabungan > 0
  const showProgresif = pkpCombined > 0;

  openSidebar(
    'Penggabungan Penghasilan (PH/MT)',
    `
      <strong>Step 1 – Penghasilan Digabung</strong><br>
      Suami: ${formatRupiah(data.ih || 0)}<br>
      Istri: ${formatRupiah(data.iw || 0)}<br>
      <strong>Total: ${formatRupiah(totalIncome)}</strong><br><br>

      <strong>Step 2 – PTKP Digabung</strong><br>
      ${formatRupiah(totalPTKP)}<br><br>

      <strong>Step 3 – PKP Gabungan</strong><br>
      ${formatRupiah(pkpCombined)}<br><br>

      ${showProgresif ? `
        <strong>Step 4 – Perhitungan Tarif Progresif</strong><br>
        ${breakdown.html}<br>

        <strong>Total PPh 21 Gabungan</strong><br>
        ${breakdown.sumText} <strong>= ${formatRupiah(totalPPh)}</strong><br><br>

        <strong>Step 5 – Alokasi PPh ke Suami & Istri</strong><br>
        PPh Suami: <span class="clickable" onclick='showDetailPPh("Suami", ${data.ih || 0}, ${data.ptkpHusband || 0})'>
          ${formatRupiah(pphHusband)}
        </span><br>
        PPh Istri: <span class="clickable" onclick='showDetailPPh("Istri", ${data.iw || 0}, ${data.ptkpWife || 0})'>
          ${formatRupiah(pphWife)}
        </span><br><br>

        <strong>Step 6 – PPh Kurang / Lebih Bayar</strong><br>
        Suami: ${formatRupiah(kurangBayarHusband)}<br>
        Istri: ${formatRupiah(kurangBayarWife)}
      ` : ''}
    `
  );
}


/* =====================    MAIN CALCULATION ===================== */
function calculate() {
  closeSidebar();

  const ih = Number(document.getElementById('incomeHusband').value.replace(/\./g, '') || 0);
  const iw = Number(document.getElementById('incomeWife').value.replace(/\./g, '') || 0);
  const ptkpH = Number(document.getElementById('ptkpHusband').value);
  const ptkpW = Number(document.getElementById('ptkpWife').value);

  const pkpH = Math.max(0, ih - ptkpH);
  const pkpW = Math.max(0, iw - ptkpW);

  const pphH = calculatePPh(pkpH);
  const pphW = calculatePPh(pkpW);

  const totalIncome = ih + iw;
  const totalPTKP = ptkpH + ptkpW;
  const pkpCombined = Math.max(0, totalIncome - totalPTKP);
  const pphCombined = calculatePPh(pkpCombined);

  const allocH = totalIncome ? Math.round((ih / totalIncome) * pphCombined) : 0;
  const allocW = pphCombined - allocH;

  const output = document.getElementById('output');
  output.style.display = 'block';
  output.innerHTML = `
    <table>
      <tr>
        <th></th>
        <th>Suami</th>
        <th>Istri</th>
      </tr>

      
    
      <tr>
        <th>PPh Terpisah</th>
        <td class="clickable"
            onclick="showDetailPPh('Suami', ${ih}, ${ptkpH})">
          ${formatRupiah(pphH)}
        </td>
        <td class="clickable"
            onclick="showDetailPPh('Istri', ${iw}, ${ptkpW})">
          ${formatRupiah(pphW)}
        </td>
      </tr>

      <tr>
        <th>Alokasi PH/MT</th>
        <td class="clickable"
            onclick='showDetailPHMT(${JSON.stringify({
              ih, iw, totalIncome, totalPTKP, pkpCombined,
              pphHusbandPaid: pphH, pphWifePaid: pphW
            })})'>
          ${formatRupiah(allocH)}
        </td>
        <td class="clickable"
            onclick='showDetailPHMT(${JSON.stringify({
              ih, iw, totalIncome, totalPTKP, pkpCombined,
              pphHusbandPaid: pphH, pphWifePaid: pphW
            })})'>
          ${formatRupiah(allocW)}
        </td>
      </tr>
    </table>
  `;
}
