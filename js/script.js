function renderBaselineResult(pphH, pphW) {
  const output = document.getElementById('output');
  output.innerHTML = `
    <h3 class="card-title">Hasil Perhitungan Terpisah (PPh 21 Per Bulan)</h3>
    <table class="result-table">
      <thead>
        <tr>
          <th>Subjek</th>
          <th>Suami</th>
          <th>Istri</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>PPh 21 Terutang (Setahun)</td>
          <td class="clickable-val" onclick="showDetailPPh('Suami', ${lastCalculationData.ih}, ${lastCalculationData.ptkpHusband})">
            ${formatRupiah(pphH)}
          </td>
          <td class="clickable-val" onclick="showDetailPPh('Istri', ${lastCalculationData.iw}, ${lastCalculationData.ptkpWife})">
            ${formatRupiah(pphW)}
          </td>
        </tr>
      </tbody>
    </table>
  `;
  output.classList.remove('hidden');
}

function renderPHMT() {
  if (!lastCalculationData) return;

  const data = lastCalculationData;
  const totalIncome = data.ih + data.iw;
  const totalPTKP = data.ptkpHusband + data.ptkpWife;
  const pkpCombined = Math.max(0, totalIncome - totalPTKP);
  const breakdown = breakdownPPhDetailed(pkpCombined);

  const allocSuami = totalIncome > 0 ? Math.round((data.ih / totalIncome) * breakdown.total) : 0;
  const allocIstri = totalIncome > 0 ? Math.round((data.iw / totalIncome) * breakdown.total) : 0;

  const selisihSuami = allocSuami - data.pphHusbandPaid;
  const selisihIstri = allocIstri - data.pphWifePaid;

  const wrapper = document.getElementById('phmt-wrapper');
  wrapper.innerHTML = `
    <h3 class="card-title">Simulasi Kesatuan Ekonomi (SPT Tahunan)</h3>
    <table class="result-table">
      <thead>
        <tr>
          <th>Keterangan</th>
          <th>Suami</th>
          <th>Istri</th>
        </tr>
      </thead>
      <tbody>
        <tr class="risk-row">
          <td>Potensi Kurang Bayar (PPh 29)</td>
          <td class="risk-val" onclick="showDetailPHMTSuami()">
            ${formatRupiah(selisihSuami)}
          </td>
          <td class="risk-val" onclick="showDetailPHMTIstri()">
            ${formatRupiah(selisihIstri)}
          </td>
        </tr>
      </tbody>
    </table>
  `;
  wrapper.classList.remove('hidden');
}