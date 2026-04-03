// 1. Masukkan Config Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyB1tIo512C1yU-SfnqxRmDEwzbRmtwEWLk",
  authDomain: "mayur-groceries.firebaseapp.com",
  databaseURL: "https://mayur-groceries-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mayur-groceries",
  storageBucket: "mayur-groceries.firebasestorage.app",
  messagingSenderId: "887475934917",
  appId: "1:887475934917:web:ad4bea0f44e5e13c5c42ac"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let databaseBelanja = [];

// 3. AMBIL DATA SECARA REALTIME
db.ref("belanja").on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
        databaseBelanja = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    } else {
        databaseBelanja = [];
    }
    renderSemua(); // Memanggil fungsi render gabungan
});

const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('view') === 'karyawan') {
    // Sembunyikan elemen admin saat dibuka karyawan
    if(document.getElementById('btnShareAkses')) document.getElementById('btnShareAkses').style.display = 'none';
    if(document.querySelector('button[onclick="logout()"]')) document.querySelector('button[onclick="logout()"]').style.display = 'none';
    if(document.getElementById('pills-tab')) document.getElementById('pills-tab').style.display = 'none';
    
    // Langsung buka tab Rundown
    const tabRundown = document.querySelector('[data-bs-target="#tab-rundown"]');
    if(tabRundown) new bootstrap.Tab(tabRundown).show();
}

// Set Tanggal Otomatis & Cek Login saat load
document.addEventListener('DOMContentLoaded', () => {
    const tglInput = document.getElementById('tglBarang');
    if(tglInput) tglInput.valueAsDate = new Date();
    
    if (sessionStorage.getItem("isLoggedIn") === "true") {
        const overlay = document.getElementById('loginOverlay');
        if(overlay) overlay.style.display = "none";
    }
});

//------------------------------------------------------------------------- HALAMAN OPERASIONAL ----------------------------------------------------------

// 4. FUNGSI TAMBAH ITEM (VERSI TERINTEGRASI)
function tambahItem() {
    const tgl = document.getElementById('tglBarang').value;
    const idBarangMaster = document.getElementById('selectBarangOperasional').value;
    const selectElement = document.getElementById('selectBarangOperasional');
    const namaBarangText = selectElement.options[selectElement.selectedIndex].text;
    
    // Mengambil ID baru yang kita buat di HTML tadi
    const qtyKotor = parseFloat(document.getElementById('inputQtyKotor').value) || 0;
    const hargaBeli = parseFloat(document.getElementById('inputHargaBeli').value) || 0;
    const rasio = parseFloat(document.getElementById('inputRasioOperasional').value) || 1;
    const petugas = document.getElementById('selectPetugas').value;

    // Tambahkan Markup
    const markupInput = document.getElementById('markupItem').value;
    const markupPersen = (markupInput === "" || isNaN(markupInput)) ? 0 : parseFloat(markupInput);

    if (!tgl || !idBarangMaster || qtyKotor <= 0) {
        alert("Mohon lengkapi Tanggal, Nama Barang, dan Jumlah!");
        return;
    }

    const idUnik = Date.now();
    const beratBersih = qtyKotor * rasio;
    const total = hargaBeli * qtyKotor;

    const dataBaru = {
        id: idUnik, // Untuk keperluan hapus/edit
        tanggal: tgl,
        idMaster: idBarangMaster,
        nama: namaBarangText,
        harga: hargaBeli,      // Kita simpan sebagai 'harga' agar sinkron dengan render lama
        jumlah: qtyKotor,      // Kita simpan sebagai 'jumlah' agar sinkron dengan render lama
        rasio: rasio,
        qtyBersih: beratBersih,
        petugas: petugas || "Belum Ditunjuk",
        markupPersen: markupPersen, // Sekarang mengambil dari input
        status: "Proses",
        timestamp: idUnik
    };

    db.ref("belanja/" + idUnik).set(dataBaru).then(() => {
        alert("Berhasil disimpan!");
        resetForm();
    });
}

function resetForm() {
    document.getElementById('selectBarangOperasional').value = '';
    document.getElementById('inputHargaBeli').value = '';
    document.getElementById('inputQtyKotor').value = '';
    document.getElementById('inputRasioOperasional').value = '1';
    document.getElementById('displayBeratBersih').innerText = '0';
}

// 5. RENDER TABEL HARIAN (OPERASIONAL) - VERSI UPDATE
function renderTabelHarian(data) {
    const container = document.getElementById('tabelHarian');
    if (!container) return;

    let html = '';
    const sortedData = [...data].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    let lastDate = "";

    sortedData.forEach(item => {
        if (item.tanggal !== lastDate) {
            html += `
            <tr>
                <td colspan="4" class="fw-bold small ps-3 py-2" 
                    style="background-color: #e7e7e7 !important; color: #3f524a !important; letter-spacing: 1px;">
                    <i class="bi bi-calendar3"></i> 📅 JADWAL BELANJA: ${item.tanggal}
                </td>
            </tr>`;
            lastDate = item.tanggal;
        }

        const total = (item.harga || 0) * (item.jumlah || 0);
        const beratBersih = item.qtyBersih ? item.qtyBersih.toFixed(2) : item.jumlah;

        html += `
            <tr class="border-bottom">
                <td class="ps-3 py-3" style="width: 40%;">
                    <div class="fw-bold text-dark" style="font-size: 1.1rem; line-height: 1.2;">${item.nama}</div>
                    <div class="badge-petugas">👤 PETUGAS: ${item.petugas.toUpperCase()}</div>
                    <div class="text-muted small mt-1" style="font-size: 0.7rem;">Rasio: ${item.rasio || 1}</div>
                </td>
                <td class="text-center py-3" style="width: 20%; background-color: #fef9e7;">
                    <div class="fw-bold text-success" style="font-size: 1.6rem;">${item.jumlah} <small class="text-muted" style="font-size: 0.6rem;">Ktr</small></div>
                    <div class="badge bg-white text-dark border small" style="font-size: 0.6rem;">Net: ${beratBersih} kg</div>
                </td>
                <td class="text-end py-3 pe-3" style="width: 25%;">
                    <div class="fw-bold text-success">Rp ${total.toLocaleString('id-ID')}</div>
                    <div class="text-muted" style="font-size: 0.7rem;">@Rp ${item.harga.toLocaleString('id-ID')}</div>
                </td>
                <td class="text-center py-3" style="width: 15%;">
                    <button onclick="hapusItem('${item.id}')" class="btn btn-sm btn-outline-danger border-0">✕</button>
                </td>
            </tr>`;
    });
    container.innerHTML = html || '<tr><td colspan="4" class="text-center py-5 text-muted">Belum ada jadwal.</td></tr>';
}

// Panggil fungsi ini agar dropdown barang di Operasional terisi
function loadMasterKeOperasional() {
    const select = document.getElementById('selectBarangOperasional');
    if(!select) return;

    db.ref("master_items").on("value", (snapshot) => {
        let options = '<option value="">Pilih Barang...</option>';
        snapshot.forEach((child) => {
            const item = child.val();
            options += `<option value="${child.key}">${item.nama}</option>`;
        });
        select.innerHTML = options;
    });
}

// Jalankan saat window load
window.addEventListener('load', loadMasterKeOperasional);
// Tambahkan di bagian paling bawah script.js atau di dalam window.onload
sinkronkanDropdownKategori();

//------------------------------------------------------------------------- HALAMAN MASTER ----------------------------------------------------------

// 6. FUNGSI MASTER DATA
// Fungsi Master Data Umum (Untuk Kategori)
function simpanMaster(path, inputId) {
    const input = document.getElementById(inputId);
    const nama = input.value.trim();
    if (!nama) return;
    db.ref(path).push({ nama: nama }).then(() => { input.value = ""; });
}

function simpanKategori() { simpanMaster("kategori", "inputKategori"); }

// FUNGSI KHUSUS KARYAWAN (Dengan Role & Deskripsi)
function simpanKaryawan() {
    const inputNama = document.getElementById('inputKaryawan');
    const inputRole = document.getElementById('inputRoleKaryawan');
    const inputDesc = document.getElementById('inputDeskripsiKaryawan'); // Jika ada textarea-nya
    
    const nama = inputNama.value.trim();
    const role = inputRole.value;
    const desc = inputDesc ? inputDesc.value.trim() : "-";

    if (!nama || !role) return alert("Nama dan Role harus diisi!");

    db.ref("karyawan").push({ 
        nama: nama, 
        role: role,
        deskripsi: desc,
        absensi: "Off" 
    }).then(() => { 
        inputNama.value = ""; 
        if(inputDesc) inputDesc.value = "";
    });
}

// Listener Kategori
db.ref("kategori").on("value", (snapshot) => {
    const list = document.getElementById('listKategori');
    if (list) {
        let html = '';
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                // MENGHAPUS '•' DAN MEMPERBESAR FONT (fw-bold & fs-6)
                html += `<li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-bottom py-2 ps-0 text-dark">
                            <span class="fw-bold" style="font-size: 1rem;">${data[key].nama}</span>
                            <button onclick="hapusMaster('kategori', '${key}')" class="btn btn-sm text-danger p-0" style="font-size: 0.8rem;">✕</button>
                         </li>`;
            });
        }
        list.innerHTML = html || '<li class="list-group-item text-muted small border-0 ps-0">Belum ada kategori.</li>';
        updateDropdownKategori(data);
    }
});

db.ref("karyawan").on("value", (snapshot) => {
    const list = document.getElementById('listKaryawan');
    if (list) {
        let html = '';
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                const k = data[key];
                html += `
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-bottom py-3 ps-0 text-dark">
                    <div>
                        <span class="fw-bold d-block" style="font-size: 1rem;">${k.nama}</span>
                        <small class="badge bg-light text-secondary border">${k.role || 'Staf'}</small>
                    </div>
                    <div class="d-flex gap-2 align-items-center">
                        <button onclick="catatAbsensi('${key}', '${k.nama}', 'Masuk')" 
                                class="btn btn-sm btn-outline-success rounded-pill px-3 fw-bold" style="font-size: 0.7rem;">
                            IN
                        </button>
                        <button onclick="catatAbsensi('${key}', '${k.nama}', 'Pulang')" 
                                class="btn btn-sm btn-outline-danger rounded-pill px-3 fw-bold" style="font-size: 0.7rem;">
                            OUT
                        </button>
                        <button onclick="hapusMaster('karyawan', '${key}')" class="btn btn-sm text-muted ms-2 p-0">✕</button>
                    </div>
                </li>`;
            });
        }
        list.innerHTML = html || '<li class="list-group-item text-muted small border-0 ps-0">Belum ada karyawan.</li>';
        updateDropdownKaryawan(data);
    }
});

function hapusMaster(path, id) { if(confirm("Hapus?")) db.ref(path).child(id).remove(); }
function hapusItem(id) { if(confirm("Hapus item?")) db.ref("belanja/"+id).remove(); }

function updateDropdownKategori(data) {
    // Dropdown di Halaman Operasional (Lama)
    const s1 = document.getElementById('selectKategori');
    // Dropdown di Halaman Master Item (Baru)
    const s2 = document.getElementById('masterPilihKategori');
    
    const options = '<option value="">Pilih Kategori...</option>' + 
        (data ? Object.values(data).map(v => `<option value="${v.nama}">${v.nama}</option>`).join('') : '');

    if(s1) s1.innerHTML = options;
    if(s2) s2.innerHTML = options;
}

function updateDropdownKaryawan(data) {
    const s = document.getElementById('selectPetugas');
    if(s) s.innerHTML = '<option value="">Pilih Petugas...</option>' + (data ? Object.values(data).map(v => `<option value="${v.nama}">${v.nama}</option>`).join('') : '');
}

function simpanMasterItem() {
    const nama = document.getElementById('masterNamaItem').value.trim();
    const kategori = document.getElementById('masterPilihKategori').value;
    const jenis = document.getElementById('masterPilihJenis').value; 
    const hargaBeli = document.getElementById('masterHargaBeli').value;
    const rasio = document.getElementById('masterRasio').value;
    const deskripsi = document.getElementById('masterDeskripsi').value;

    if (!nama || !kategori || !jenis) return alert("Nama, Kategori, dan Jenis Barang harus diisi!");

    // Logika Simpan ke Firebase
    db.ref("master_items").push({
        nama: nama,
        kategori: kategori,
        jenis: jenis, 
        hargaBeli: parseFloat(hargaBeli) || 0,
        rasioBersih: parseFloat(rasio) || 1,
        stok_tersedia: 0, 
        deskripsi: deskripsi
    }).then(() => {
        // Reset form setelah berhasil
        document.getElementById('masterNamaItem').value = "";
        document.getElementById('masterPilihKategori').value = "";
        document.getElementById('masterPilihJenis').value = "";
        document.getElementById('masterHargaBeli').value = "";
        document.getElementById('masterRasio').value = "1";
        document.getElementById('masterDeskripsi').value = "";
        alert("Item berhasil disimpan ke Database!");
    }).catch((error) => {
        alert("Gagal menyimpan: " + error.message);
    });
}

// 1. Fungsi Tambah Role Baru ke Firebase
function tambahRoleBaru() {
    const roleBaru = prompt("Masukkan nama Role baru (contoh: Dapur, Driver, QC):");
    if (roleBaru && roleBaru.trim() !== "") {
        db.ref("settings/roles").push(roleBaru.trim());
    }
}

// 2. Listener untuk mengisi Dropdown Role secara Real-time
db.ref("settings/roles").on("value", (snapshot) => {
    const select = document.getElementById('inputRoleKaryawan');
    if (!select) return;
    
    const data = snapshot.val();
    let html = '<option value="">Pilih Role...</option>';
    
    if (data) {
        Object.values(data).forEach(role => {
            html += `<option value="${role}">${role}</option>`;
        });
    } else {
        // Role default jika Firebase masih kosong
        html += `
            <option value="Admin">Admin</option>
            <option value="Belanja">Bagian Belanja</option>
            <option value="Dapur">Bagian Dapur</option>
        `;
    }
    select.innerHTML = html;
});

function catatAbsensi(idKaryawan, nama, tipe) {
    const sekarang = new Date();
    // Format tanggal lokal Indonesia (YYYY-MM-DD)
    const tanggalId = sekarang.toLocaleDateString('en-CA'); 
    const jamSekarang = sekarang.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const fieldUpdate = {};
    fieldUpdate['nama'] = nama;
    fieldUpdate['tanggal'] = tanggalId;
    
    // Tentukan apakah mengisi jam masuk atau jam pulang
    if (tipe === 'Masuk') {
        fieldUpdate['jamMasuk'] = jamSekarang;
    } else {
        fieldUpdate['jamPulang'] = jamSekarang;
    }

    // Simpan ke node: absensi/2026-04-03/idKaryawan
    db.ref("absensi/" + tanggalId + "/" + idKaryawan).update(fieldUpdate)
        .then(() => {
            alert(`✅ ${nama} absen ${tipe} jam ${jamSekarang}`);
        })
        .catch((error) => {
            console.error("Gagal Absen:", error);
        });
}
//------------------------------------------------------------------------- FUNGSI LAIN  ----------------------------------------------------------

// 7. RENDER SEMUA (Pusat Update UI)
function renderSemua() {
    renderTabelHarian(databaseBelanja);
    renderJurnal(databaseBelanja);
    renderRundown(databaseBelanja); // <--- Fungsi baru kita
    
    // Update total uang di dashboard
    const total = databaseBelanja.reduce((acc, curr) => acc + (curr.harga * curr.jumlah), 0);
    const disp = document.getElementById('grandTotal');
    if (disp) disp.innerText = `Total: Rp ${total.toLocaleString('id-ID')}`;
}

function editHarga(id, hargaLama) {
    const baru = prompt("Update Harga:", hargaLama);
    if (baru !== null) db.ref("belanja/" + id).update({ harga: parseFloat(baru) });
}

function cekLogin() {
    const pin = document.getElementById('pinInput').value;
    if (pin === "1234") {
        sessionStorage.setItem("isLoggedIn", "true");
        document.getElementById('loginOverlay').style.display = "none";
    } else { alert("PIN Salah"); }
}

function logout() {
    sessionStorage.removeItem("isLoggedIn");
    location.reload();
}

function tutupMenu() {
    const menuElement = document.getElementById('offcanvasMenu');
    const instance = bootstrap.Offcanvas.getInstance(menuElement);
    if (instance) instance.hide();
}

//------------------------------------------------------------------------- HALAMAN JURNAL ----------------------------------------------------------

// 8. FUNGSI JURNAL
function renderJurnal(dataArr) {
    const container = document.getElementById('jurnal-container');
    if (!container || !dataArr) return;

    let html = `
        <div class="table-responsive rounded-3 shadow-sm bg-white border">
            <table class="table table-hover align-middle m-0">
                <thead class="bg-success text-white small text-uppercase">
                    <tr>
                        <th class="ps-3 py-3 border-0">Item & Info</th>
                        <th class="text-center border-0">Modal</th>
                        <th class="text-center border-0">Markup</th>
                        <th class="text-end pe-3 border-0">Tagihan</th>
                    </tr>
                </thead>
                <tbody>`;

    let totalModal = 0;
    let totalTagihan = 0;

    const sortedData = [...dataArr].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    sortedData.forEach(item => {
        const mPersen = item.markupPersen || 0; // Sekarang default 0 sesuai permintaanmu sebelumnya
        
        // Modal tetap dihitung dari uang yang keluar di pasar (Harga Beli * Qty Kotor)
        const modal = (item.harga || 0) * (item.jumlah || 0); 
        
        // Tagihan dihitung dari Modal + Keuntungan yang diinginkan
        const tagihan = modal * (1 + (mPersen / 100));
        
        // HITUNG HARGA JUAL PER KG BERSIH (Untuk info ke pelanggan)
        const hargaJualBersih = item.qtyBersih > 0 ? tagihan / item.qtyBersih : 0;

        totalModal += modal;
        totalTagihan += tagihan;

        html += `
            <tr class="border-bottom">
                <td class="ps-3 py-3">
                    <div class="fw-bold text-dark">${item.nama}</div>
                    <div class="text-muted small" style="font-size: 0.7rem;">
                        Net: ${item.qtyBersih?.toFixed(2) || 0} kg | Jual: Rp ${Math.round(hargaJualBersih).toLocaleString('id-ID')}/kg
                    </div>
                </td>
                <td class="text-center text-secondary small">
                    Rp ${modal.toLocaleString('id-ID')}
                </td>
                <td class="text-center">
                    <span class="badge rounded-pill text-dark px-3" 
                        style="background-color: #ffc107; font-size: 0.7rem; font-weight: 800;">
                        ${mPersen}%
                    </span>
                </td>
                <td class="text-end fw-bold text-success pe-3">
                    Rp ${tagihan.toLocaleString('id-ID')}
                </td>
            </tr>`;
    });

    const totalProfit = totalTagihan - totalModal;

    html += `
                </tbody>
                <tfoot class="bg-dark text-white">
                    <tr class="fw-bold">
                        <td class="ps-3 py-3">RINGKASAN TOTAL</td>
                        <td class="text-center small text-light">Rp ${totalModal.toLocaleString('id-ID')}</td>
                        <td class="text-center text-warning" style="font-size: 0.75rem; letter-spacing: 0.5px;">
                            EST. PROFIT: Rp ${totalProfit.toLocaleString('id-ID')}
                        </td>
                        <td class="text-end pe-3 text-dark" style="font-size: 1.1rem;">
                            Rp ${totalTagihan.toLocaleString('id-ID')}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>`;

    container.innerHTML = html;
}

function tambahBiaya() {
    const nama = document.getElementById('namaBiaya').value.trim();
    const nominal = parseFloat(document.getElementById('nominalBiaya').value);
    const tgl = document.getElementById('tglBarang').value;

    if (!nama || isNaN(nominal)) {
        alert("Isi keterangan biaya dan nominalnya!");
        return;
    }

    const idUnik = Date.now();
    const dataBiaya = {
        tanggal: tgl,
        nama: `[BIAYA] ${nama}`,
        harga: nominal,
        jumlah: 1,
        kategori: "Operasional",
        petugas: "Sistem",
        markupPersen: 0,
        status: "Pengeluaran",
        timestamp: idUnik
    };

    db.ref("belanja/" + idUnik).set(dataBiaya).then(() => {
        document.getElementById('namaBiaya').value = "";
        document.getElementById('nominalBiaya').value = "";
        alert("Biaya dicatat.");
    });
}

function filterDataHarian() {
    const tglMulai = document.getElementById('filterTglMulai').value;
    const tglSelesai = document.getElementById('filterTglSelesai').value;
    const kategori = document.getElementById('filterKategoriRingkasan').value; // Ambil nilai kategori

    if (!tglMulai || !tglSelesai) {
        alert("Pilih rentang tanggal terlebih dahulu!");
        return;
    }

    // Filter data berdasarkan rentang tanggal DAN Kategori
    const dataFiltered = databaseBelanja.filter(item => {
        const matchTanggal = item.tanggal >= tglMulai && item.tanggal <= tglSelesai;
        const matchKategori = (kategori === "Semua" || item.kategori === kategori);
        
        return matchTanggal && matchKategori;
    });

    // Render ulang tabel harian dengan data yang sudah difilter (Tanggal + Kategori)
    renderTabelHarian(dataFiltered);
    
    // Update Ringkasan Total khusus untuk data yang difilter
    const totalFiltered = dataFiltered.reduce((acc, curr) => {
        const harga = curr.harga || 0;
        const jumlah = curr.jumlah || 0;
        return acc + (harga * jumlah);
    }, 0);

    const disp = document.getElementById('grandTotal');
    if(disp) {
        disp.innerText = `Total: Rp ${totalFiltered.toLocaleString('id-ID')}`;
    }
}

function sinkronkanDropdownKategori() {
    const selectFilter = document.getElementById('filterKategoriRingkasan');
    if (!selectFilter) return;

    db.ref("kategori").on("value", (snapshot) => {
        const daftarKategori = snapshot.val();
        
        // Simpan pilihan "Semua" agar tidak hilang
        let htmlOptions = '<option value="Semua">Semua Kategori</option>';

        if (daftarKategori) {
            Object.keys(daftarKategori).forEach(key => {
                const namaKategori = daftarKategori[key].nama; // Sesuaikan jika nama fieldnya bukan 'nama'
                htmlOptions += `<option value="${namaKategori}">${namaKategori}</option>`;
            });
        }
        
        selectFilter.innerHTML = htmlOptions;
    });
}

// Tambahkan di baris render jurnal untuk update status ke Firebase
function tandaiLunas(id) {
    db.ref("belanja/" + id).update({ statusBayar: "Lunas" });
}

//------------------------------------------------------------------------- HALAMAN RUNDOWN ----------------------------------------------------------

function renderRundown(dataArr) {
    const container = document.getElementById('rundown-container');
    if (!container || !dataArr) return;

    // Filter data bukan biaya
    const dataBarang = dataArr.filter(item => !item.nama.includes("[BIAYA]"));
    
    // Grouping berdasarkan petugas
    const grouped = dataBarang.reduce((acc, item) => {
        if (!acc[item.petugas]) acc[item.petugas] = [];
        acc[item.petugas].push(item);
        return acc;
    }, {});

    let html = `
        <div class="col-12 mb-3 d-lg-none">
            <select class="form-select rounded-pill border-success shadow-sm" onchange="filterPetugas(this.value)">
                <option value="">Lihat Semua Petugas...</option>
                ${Object.keys(grouped).map(p => `<option value="${p}">${p.toUpperCase()}</option>`).join('')}
            </select>
        </div>
    `;

    Object.keys(grouped).forEach((petugas, index) => {
        const idCollapse = `collapse-${petugas.replace(/\s+/g, '')}`;
        const totalTugas = grouped[petugas].length;
        const tugasSelesai = grouped[petugas].filter(item => item.step3).length;

        html += `
        <div class="col-md-6 col-lg-4 mb-3 card-petugas" data-nama="${petugas}">
            <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div class="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center" 
                     style="cursor: pointer;" 
                     data-bs-toggle="collapse" 
                     data-bs-target="#${idCollapse}">
                    <div>
                        <h6 class="m-0 fw-bold text-success">👤 ${petugas.toUpperCase()}</h6>
                        <small class="text-muted">${tugasSelesai}/${totalTugas} Tugas Selesai</small>
                    </div>
                    <span class="badge rounded-pill ${tugasSelesai === totalTugas ? 'bg-success' : 'bg-warning text-dark'}">
                        ${tugasSelesai === totalTugas ? '✓' : '●'}
                    </span>
                </div>

                <div class="collapse ${index === 0 ? 'show' : ''}" id="${idCollapse}">
                    <div class="list-group list-group-flush border-top">`;

        grouped[petugas].forEach(item => {
            const qcDone = item.qcKualitas && item.qcBerat && item.qcPacking;
            const isBelanja = item.step1;
            const isProses = item.step2;
            const isSiap = item.step3;

            let bgColor = "#ffffff";
            if (isSiap) bgColor = "#f1f3f5"; // Abu-abu sangat muda untuk yang selesai
            else if (isProses) bgColor = "#fff9db";
            else if (isBelanja) bgColor = "#f8f9fa";

            html += `
            <div class="list-group-item p-3 border-0 border-bottom" style="background-color: ${bgColor} !important;">
                <div class="d-flex justify-content-between">
                    <div class="fw-bold ${isSiap ? 'text-decoration-line-through text-muted' : 'text-dark'}" style="font-size: 1rem;">
                        ${item.nama}
                    </div>
                    ${isSiap ? '<span class="text-success small fw-bold">READY</span>' : ''}
                </div>

                <div class="${isSiap ? 'd-none' : ''} mt-2">
                    <div class="row g-1 text-center bg-white rounded-3 shadow-sm mb-2 py-1">
                        <div class="col-6 border-end">
                            <small class="d-block text-muted" style="font-size: 0.6rem;">Gross</small>
                            <span class="fw-bold">${item.jumlah || 0}kg</span>
                        </div>
                        <div class="col-6">
                            <small class="d-block text-muted" style="font-size: 0.6rem;">Netto</small>
                            <span class="fw-bold text-success">${item.qtyBersih ? item.qtyBersih.toFixed(2) : item.jumlah}kg</span>
                        </div>
                    </div>

                    <div class="d-flex flex-wrap gap-1 mb-2">
                        ${renderQCCheck(item.id, 'qcKualitas', 'Kualitas', item.qcKualitas, !isProses || isSiap)}
                        ${renderQCCheck(item.id, 'qcBerat', 'Berat', item.qcBerat, !isProses || isSiap)}
                        ${renderQCCheck(item.id, 'qcPacking', 'Packing', item.qcPacking, !isProses || isSiap)}
                    </div>

                    <div class="btn-group w-100 shadow-sm">
                        <button onclick="updateStep('${item.id}', 'step1', ${!isBelanja})" class="btn btn-xs ${isBelanja ? 'btn-success' : 'btn-outline-secondary'}">BELANJA</button>
                        <button onclick="updateStep('${item.id}', 'step2', ${!isProses})" ${!isBelanja ? 'disabled' : ''} class="btn btn-xs ${isProses ? 'btn-warning' : 'btn-outline-secondary'}">PROSES</button>
                        <button onclick="updateStep('${item.id}', 'step3', ${!isSiap})" ${!qcDone || isSiap ? 'disabled' : ''} class="btn btn-xs ${isSiap ? 'btn-primary' : 'btn-outline-primary'} fw-bold">SIAP</button>
                    </div>
                </div>
            </div>`;
        });

        html += `</div></div></div></div>`;
    });
    container.innerHTML = html;
}

// Fungsi Filter Tambahan
function filterPetugas(nama) {
    const cards = document.querySelectorAll('.card-petugas');
    cards.forEach(card => {
        if (nama === "" || card.getAttribute('data-nama') === nama) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

// Fungsi Helper untuk render tombol QC
function renderQCCheck(itemId, key, label, isChecked, isDisabled) {
    return `
        <button onclick="updateQC('${itemId}', '${key}', ${!isChecked})" 
            ${isDisabled ? 'disabled' : ''}
            class="btn btn-xs py-1 px-2 border-0 rounded-pill" 
            style="font-size: 0.65rem; background-color: ${isChecked ? '#1b4d3e' : '#e9ecef'}; color: ${isChecked ? 'white' : '#6c757d'}; opacity: ${isDisabled ? '0.5' : '1'};">
            ${isChecked ? '●' : '○'} ${label}
        </button>`;
}

// 1. Fungsi khusus update Quality Control
function updateQC(itemId, key, val) {
    const updateData = {};
    updateData[key] = val;
    db.ref("belanja/" + itemId).update(updateData);
}

// Listener untuk menampilkan Tabel Inventori
// LISTENER OTOMATIS: Jalan setiap ada perubahan di Firebase
db.ref("master_items").on("value", (snapshot) => {
    const tbody = document.getElementById('tabelStok');
    if (!tbody) return; // Jika elemen tidak ditemukan, berhenti.

    let html = '';
    const data = snapshot.val();

    if (data) {
        Object.keys(data).forEach(id => {
            const item = data[id];
            const stok = item.stok_tersedia || 0;
            const isFresh = item.jenis === "Fresh";

            html += `
                <tr class="${isFresh && stok > 0 ? 'table-warning' : ''}">
                    <td>
                        <div class="fw-bold text-dark">${item.nama}</div>
                        <small class="text-muted">${item.kategori || '-'}</small>
                    </td>
                    <td>
                        <span class="badge ${isFresh ? 'bg-info text-dark' : 'bg-secondary'} rounded-pill">
                            ${item.jenis || 'Dry'}
                        </span>
                    </td>
                    <td class="text-center fw-bold ${stok > 0 ? 'text-success' : 'text-muted'}">
                        ${stok.toFixed(2)} kg
                    </td>
                    <td class="text-end">
                        ${isFresh && stok > 0 ? 
                            '<span class="badge bg-danger">⚠️ WASTE RISK</span>' : 
                            '<span class="text-muted small">Aman</span>'}
                    </td>
                </tr>`;
        });
    } else {
        html = '<tr><td colspan="4" class="text-center py-4 text-muted">Data stok kosong.</td></tr>';
    }
    tbody.innerHTML = html;
});

// FUNGSI HELPER UNTUK TOMBOL MINIMALIS
function renderStep(itemId, label, isChecked) {
    const textColor = isChecked ? '#1b4d3e' : '#adb5bd';
    const fw = isChecked ? '800' : '500';
    const icon = isChecked ? '●' : '○';
    const stepKey = label === 'Belanja' ? 'step1' : (label === 'Proses' ? 'step2' : 'step3');
    
    return `
        <span onclick="updateStep('${itemId}', '${stepKey}', ${!isChecked})" 
              style="cursor: pointer; font-size: 0.75rem; color: ${textColor}; font-weight: ${fw}; transition: 0.2s;">
            ${icon} ${label}
        </span>`;
}

// Helper untuk membuat tombol step alur
function renderStep(itemId, label, isChecked) {
    // Tombol tanpa border dan tanpa background (hanya teks)
    // Jika isChecked true, teks jadi hijau gelap agar kontras dengan background pastel
    const textColor = isChecked ? '#1b4d3e' : '#6c757d';
    const fw = isChecked ? '800' : '500';
    const stepKey = label === 'Belanja' ? 'step1' : (label === 'Proses' ? 'step2' : 'step3');
    
    return `
        <button onclick="updateStep('${itemId}', '${stepKey}', ${!isChecked})" 
                class="btn btn-sm p-0 me-2 border-0" 
                style="font-size: 0.7rem; color: ${textColor}; font-weight: ${fw}; background: none !important;">
            ${isChecked ? '●' : '○'} ${label}
        </button>`;
}

// 2. FUNGSI UPDATE STEP KE FIREBASE
function updateStep(itemId, stepKey, val) {
    const updateData = {};
    updateData[stepKey] = val;
    
    // Logika Otomatis: Jika langkah lanjut diklik, langkah sebelumnya otomatis dianggap selesai
    if (stepKey === 'step3' && val === true) {
        updateData['step1'] = true;
        updateData['step2'] = true;
        updateData['statusAlur'] = "Siap Kirim";
    } else if (stepKey === 'step2' && val === true) {
        updateData['step1'] = true;
        updateData['statusAlur'] = "Processing";
    } else if (stepKey === 'step1' && val === true) {
        updateData['statusAlur'] = "Selesai Belanja";
    } else {
        // Jika semua dimatikan kembali
        if (stepKey === 'step1' && val === false) {
            updateData['step1'] = false;
            updateData['step2'] = false;
            updateData['step3'] = false;
            updateData['statusAlur'] = "Diterima";
        }
    }

    db.ref("belanja/" + itemId).update(updateData);
}

// --- LOGIKA PEMBATASAN AKSES KARYAWAN ---
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewMode = urlParams.get('view');

    if (viewMode === 'karyawan') {
        // 1. Sembunyikan Navigasi Tab Admin & Tombol Keluar
        document.getElementById('pills-tab').style.display = 'none';
        document.querySelector('button[onclick="logout()"]').style.display = 'none';
        
        // 2. Sembunyikan Header Judul agar lebih luas di HP (Opsional)
        // document.querySelector('.mb-4.border-bottom').style.display = 'none';

        // 3. Paksa aplikasi langsung membuka Tab Rundown
        const rundownTabTrigger = document.querySelector('[data-bs-target="#tab-rundown"]');
        if (rundownTabTrigger) {
            const tab = new bootstrap.Tab(rundownTabTrigger);
            tab.show();
        }

        // 4. Ubah Judul agar Karyawan tahu ini halaman tugas mereka
        const titleEl = document.querySelector('h2.fw-bold');
        if (titleEl) titleEl.innerText = "Tugas Lapangan";
    }
});

// --- SISTEM NOTIFIKASI ADMIN ---
const notifSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

// Monitor perubahan pada tabel 'belanja'
db.ref("belanja").on("child_changed", (snapshot) => {
    const item = snapshot.val();
    const urlParams = new URLSearchParams(window.location.search);
    
    // Notifikasi HANYA muncul di layar Admin (yang tidak ada ?view=karyawan)
    if (urlParams.get('view') !== 'karyawan') {
        
        // 1. Bunyikan suara 'Ding'
        notifSound.play().catch(() => console.log("Klik layar dulu agar suara aktif"));

        // 2. Tampilkan pesan melayang (Toast)
        const toastContainer = document.getElementById('toast-notification');
        if (!toastContainer) {
            const div = document.createElement('div');
            div.id = 'toast-notification';
            div.style = "position: fixed; top: 20px; right: 20px; z-index: 9999;";
            document.body.appendChild(div);
        }

        const msg = document.createElement('div');
        msg.className = "alert alert-success shadow-lg border-0 rounded-pill mb-2 animated fadeInRight";
        msg.innerHTML = `<strong>✅ Update:</strong> ${item.nama} → <span class="badge bg-dark">${item.statusAlur}</span>`;
        
        document.getElementById('toast-notification').appendChild(msg);

        // Hilang otomatis setelah 4 detik
        setTimeout(() => {
            msg.style.opacity = '0';
            setTimeout(() => msg.remove(), 500);
        }, 4000);
    }
});

// Variable global untuk link
let globalShareUrl = "";

function shareKaryawanLink() {
    // Buat URL dinamis
    const currentUrl = window.location.origin + window.location.pathname;
    globalShareUrl = currentUrl + "?view=karyawan";
    
    // Masukkan ke input di dalam modal
    document.getElementById('inputShareLink').value = globalShareUrl;
    
    // Tampilkan Modal
    const myModal = new bootstrap.Modal(document.getElementById('modalShare'));
    myModal.show();
}

// Fungsi untuk Salin Teks
function copyToClipboard() {
    const copyText = document.getElementById("inputShareLink");
    navigator.clipboard.writeText(copyText.value).then(() => {
        // Beri feedback visual pada tombol
        const btn = event.target;
        const originalText = btn.innerText;
        btn.innerText = "Selesai!";
        btn.classList.replace('btn-success', 'btn-dark');
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.replace('btn-dark', 'btn-success');
        }, 2000);
    });
}

// Fungsi Khusus WhatsApp
function shareViaWA() {
    const text = encodeURIComponent("Halo, berikut adalah link rundown pekerjaan Mayur Groceries hari ini: " + globalShareUrl);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

// --- LOGIKA AUTO-FILL DARI MASTER KE OPERASIONAL ---

// Listener saat Admin/Karyawan memilih barang di dropdown Operasional
document.getElementById('selectBarangOperasional').addEventListener('change', function() {
    const idBarang = this.value;
    if (!idBarang) return; // Jika pilih kosong, abaikan
    
    // Ambil data detail barang dari Firebase
    db.ref("master_items/" + idBarang).once("value", (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            // 1. Isi otomatis Harga Beli Standar dari Master
            // (Tetap bisa diedit jika harga pasar hari itu berubah)
            const inputHarga = document.getElementById('inputHargaBeli');
            if(inputHarga) inputHarga.value = data.hargaBeli || 0;
            
            // 2. Isi otomatis Rasio Bersih (misal 0.9 untuk cabe)
            const inputRasio = document.getElementById('inputRasioOperasional');
            if(inputRasio) inputRasio.value = data.rasioBersih || 1;
            
            // 3. Langsung hitung simulasi berat bersih & harga satuan
            hitungSimulasiBersih();
        }
    });
});

// Fungsi perhitungan otomatis
function hitungSimulasiBersih() {
    // Ambil nilai input
    const kotor = parseFloat(document.getElementById('inputQtyKotor').value) || 0;
    const rasio = parseFloat(document.getElementById('inputRasioOperasional').value) || 1;
    const hargaBeli = parseFloat(document.getElementById('inputHargaBeli').value) || 0;
    
    // Rumus: Berat Bersih = Kotor x Rasio
    const bersih = kotor * rasio;
    
    // Rumus: Harga Satuan Bersih = (Harga Beli x Berat Kotor) / Berat Bersih
    // Atau jika hargaBeli adalah harga per kg kotor:
    const totalHarga = hargaBeli * kotor;
    const hargaSatuanBersih = bersih > 0 ? totalHarga / bersih : 0;

    // Tampilkan ke UI (Gunakan ID yang sesuai di HTML Operasional)
    const displayBersih = document.getElementById('displayBeratBersih');
    const displaySatuan = document.getElementById('displayHargaSatuan');
    
    if(displayBersih) displayBersih.innerText = bersih.toFixed(2) + " kg";
    if(displaySatuan) displaySatuan.innerText = "Rp " + Math.round(hargaSatuanBersih).toLocaleString('id-ID');
}

// Tambahkan listener agar saat mengetik angka, hitungannya langsung update (Live)
document.getElementById('inputQtyKotor').addEventListener('input', hitungSimulasiBersih);
document.getElementById('inputRasioOperasional').addEventListener('input', hitungSimulasiBersih);
document.getElementById('inputHargaBeli').addEventListener('input', hitungSimulasiBersih);

// 2. Modifikasi updateStep untuk logika stok
function updateStep(itemId, stepKey, val) {
    const updateData = {};
    updateData[stepKey] = val;

    db.ref("belanja/" + itemId).once("value", (snapshot) => {
        const item = snapshot.val();
        if (!item) return;

        // --- LOGIKA STOK ---
        if (stepKey === 'step1') {
            if (item.idMaster) {
                const masterRef = db.ref("master_items/" + item.idMaster + "/stok_tersedia");
                masterRef.transaction((currentStok) => {
                    let stokSekarang = currentStok || 0;
                    let tambah = item.qtyBersih || 0;
                    return val === true ? (stokSekarang + tambah) : Math.max(0, stokSekarang - tambah);
                });
                if (val === true) updateData['statusAlur'] = "Selesai Belanja";
            }
        }

        // --- LOGIKA STATUS ALUR ---
        if (stepKey === 'step2' && val === true) updateData['statusAlur'] = "Sedang Diproses";
        
        if (stepKey === 'step3' && val === true) {
            updateData['statusAlur'] = "Siap Kirim";
            updateData['status'] = "Selesai";
        }

        // --- PROTEKSI OFF (RUNTUN) ---
        if (val === false) {
            if (stepKey === 'step1') { 
                updateData['step2'] = false; 
                updateData['step3'] = false;
                updateData['statusAlur'] = "Rencana"; 
            }
            if (stepKey === 'step2') { 
                updateData['step3'] = false; 
            }
        }

        // Jalankan Update
        db.ref("belanja/" + itemId).update(updateData).then(() => {
            console.log("Update Berhasil ke Firebase!");
        });
    });
}

// 3. AMBIL DATA SECARA REALTIME
db.ref("belanja").on("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
        databaseBelanja = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));
    } else {
        databaseBelanja = [];
    }
    
    // Setiap kali ada perubahan data, 3 fungsi ini akan langsung dipanggil:
    renderSemua();          // Update Tabel Operasional/Belanja
    aktifkanLiveTracking(); // Update Milestone View Customer
    sinkronkanSuratJalan(); // Update Tabel Surat Jalan
});

// Variable sementara untuk menampung item yang akan diprint
let keranjangKirim = [];

function tambahItemKirim() {
    const customer = document.getElementById('namaCustomer').value.trim();
    const idMaster = document.getElementById('selectBarangStok').value;
    const selectBarang = document.getElementById('selectBarangStok');
    const namaBarang = selectBarang.options[selectBarang.selectedIndex].text;
    const qty = parseFloat(document.getElementById('qtyKirim').value) || 0;

    if (!customer || !idMaster || qty <= 0) {
        return alert("Lengkapi Nama Customer, Pilih Barang, dan Isi Qty!");
    }

    // 1. Cek ketersediaan stok di Firebase dulu
    db.ref("master_items/" + idMaster).once("value", (snapshot) => {
        const dataMaster = snapshot.val();
        const stokTersedia = dataMaster.stok_tersedia || 0;

        if (qty > stokTersedia) {
            return alert(`Stok tidak cukup! Tersedia: ${stokTersedia.toFixed(2)} kg`);
        }

        // 2. Jika stok cukup, POTONG STOK di Master
        db.ref("master_items/" + idMaster + "/stok_tersedia").transaction((current) => {
            return (current || 0) - qty;
        });

        // 3. Masukkan ke keranjang tampilan cetak
        keranjangKirim.push({ nama: namaBarang, qty: qty });
        
        // 4. Update Tampilan Preview Surat Jalan
        renderPreviewSuratJalan(customer);
        
        // Reset input qty
        document.getElementById('qtyKirim').value = "";
    });
}

function renderPreviewSuratJalan() {
    const noSJ = document.getElementById('noSuratJalan').value || "-";
    const customer = document.getElementById('namaCustomer').value || "-";
    const alamat = document.getElementById('alamatCustomer').value || "-";
    
    // Format Tanggal: Sidoarjo, 03 April 2026
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    const tglFormatted = "Sidoarjo, " + new Date().toLocaleDateString('id-ID', options);

    document.getElementById('p_noSJ').innerText = noSJ;
    document.getElementById('p_tgl').innerText = tglFormatted;
    document.getElementById('p_cust').innerText = customer;
    document.getElementById('p_alamat').innerText = alamat;
    
    const tbody = document.getElementById('listKirim');
    let html = '';
    
    // Loop item di keranjang
    keranjangKirim.forEach((item, index) => {
        html += `
            <tr>
                <td class="text-center border-dark">${index + 1}</td>
                <td class="border-dark fw-bold">${item.nama}</td>
                <td class="text-center border-dark fw-bold">${item.qty.toFixed(2)}</td>
                <td class="text-center border-dark">kg</td>
            </tr>`;
    });

    // Menambahkan baris kosong agar tabel tetap terlihat proporsional (min 5 baris)
    const minBaris = 6;
    if (keranjangKirim.length < minBaris) {
        for (let i = keranjangKirim.length; i < minBaris; i++) {
            html += `<tr><td class="border-dark text-white">${i+1}</td><td class="border-dark"></td><td class="border-dark"></td><td class="border-dark"></td></tr>`;
        }
    }
    
    tbody.innerHTML = html;
}

// Mengisi dropdown pilih barang di tab Penjualan secara otomatis
db.ref("master_items").on("value", (snapshot) => {
    const select = document.getElementById('selectBarangStok');
    if (!select) return;

    let html = '<option value="">-- Pilih Barang --</option>';
    const data = snapshot.val();
    
    if (data) {
        Object.keys(data).forEach(id => {
            const item = data[id];
            // Hanya tampilkan barang yang punya stok > 0
            if ((item.stok_tersedia || 0) > 0) {
                html += `<option value="${id}">${item.nama} (Tersedia: ${item.stok_tersedia.toFixed(2)}kg)</option>`;
            }
        });
    }
    select.innerHTML = html;
});

// Fungsi untuk memfilter barang yang sudah SIAP di Rundown
function generateSuratJalanOtomatis() {
    const tabelSJ = document.getElementById('listKirim');
    tabelSJ.innerHTML = ''; // Kosongkan tabel lama
    let no = 1;

    // Anggap 'dataRundown' adalah array hasil fetch dari Firebase hari ini
    dataRundown.forEach((item) => {
        // HANYA tarik yang sudah di-klik SIAP (Step 3)
        if (item.status === 'siap') {
            const row = `
                <tr>
                    <td style="border: 2px solid #000; padding: 10px; text-align: center;">${no++}</td>
                    <td style="border: 2px solid #000; padding: 10px;">${item.nama.toUpperCase()}</td>
                    <td style="border: 2px solid #000; padding: 10px; text-align: center; font-weight: bold;">
                        ${item.qty} ${item.satuan}
                    </td>
                </tr>`;
            tabelSJ.innerHTML += row;
        }
    });

    // Update Nomor Surat Jalan (Format MG sesuai PDF)
    const tgl = new Date().toISOString().slice(2,10).replace(/-/g, ''); // Contoh: 260401
    document.getElementById('p_noSJ').innerText = `01${tgl}`; // [cite: 8, 9]
}

function generateSuratJalanDariRundown() {
    const listKirim = document.getElementById('listKirim');
    listKirim.innerHTML = ''; // Kosongkan tabel surat jalan
    let no = 1;

    db.ref('rundown_today').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach((key) => {
                const item = data[key];
                
                // HANYA masukkan item yang statusnya sudah 'siap' (Step 3)
                if (item.status === 'siap') {
                    const row = `
                        <tr>
                            <td style="border: 2px solid #000; padding: 10px; text-align: center;">${no++}</td>
                            <td style="border: 2px solid #000; padding: 10px; text-transform: uppercase;">${item.nama}</td>
                            <td style="border: 2px solid #000; padding: 10px; text-align: center; font-weight: bold;">
                                ${item.qty} ${item.satuan.toUpperCase()}
                            </td>
                        </tr>`;
                    listKirim.innerHTML += row;
                }
            });
            
            // Notifikasi jika berhasil
            alert("Berhasil menarik data item yang SIAP!");
        }
    });
}

//Split SURAT JALAN TIAP 5 ITEM

function sinkronkanSuratJalan() {
    const containerUtama = document.getElementById('area-cetak'); 
    if (!containerUtama) return;

    // 1. Ambil data yang sudah SIAP (Step 3)
    const itemsSiap = databaseBelanja.filter(item => item.step3 === true);
    
    if (itemsSiap.length === 0) {
        containerUtama.innerHTML = '<div class="text-center py-5 text-muted">Belum ada barang yang berstatus SIAP.</div>';
        return;
    }

    // 2. Ambil data header dari input agar sinkron
    const noSJ = document.getElementById('sj_nomor')?.value || "......";
    const namaCust = document.getElementById('p_cust')?.innerText || "-";
    const alamatCust = document.getElementById('p_alamat')?.innerHTML || "-";
    const tglTeks = document.getElementById('p_lokasi_tgl')?.innerText || "";

    // 3. Pecah array menjadi kelompok (chunk) berisi maksimal 5 item
    const perHalaman = 5;
    const kumpulanHalaman = [];
    for (let i = 0; i < itemsSiap.length; i += perHalaman) {
        kumpulanHalaman.push(itemsSiap.slice(i, i + perHalaman));
    }

    // 4. Bersihkan area cetak dan render ulang per lembar
    containerUtama.innerHTML = ''; 

    kumpulanHalaman.forEach((halamanItems, index) => {
        const hlmKe = index + 1;
        const totalHlm = kumpulanHalaman.length;

        let rowsHtml = '';
        halamanItems.forEach((item, idx) => {
            const noUrut = (index * perHalaman) + (idx + 1);
            rowsHtml += `
                <tr>
                    <td style="border: 1px solid #000; padding: 10px; text-align: center;">${noUrut}</td>
                    <td style="border: 1px solid #000; padding: 10px; text-transform: uppercase;">${item.nama}</td>
                    <td style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold;">
                        ${item.qtyBersih ? item.qtyBersih.toFixed(2) : (item.jumlah || 0)} KG
                    </td>
                </tr>`;
        });

        // Tambahkan baris kosong jika item < 5 agar tinggi tabel seragam (opsional)
        for (let i = halamanItems.length; i < perHalaman; i++) {
            rowsHtml += `<tr><td style="border: 1px solid #000; padding: 15px;">&nbsp;</td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>`;
        }

        // Render satu lembar Surat Jalan
        containerUtama.innerHTML += `
            <div class="halaman-surat-jalan" style="${index > 0 ? 'page-break-before: always; margin-top: 30px;' : ''} background: white; color: black; font-family: Arial, sans-serif;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="display: flex; align-items: center;">
                        <img src="Logo.png" alt="Logo" style="height: 75px; margin-right: 15px; object-fit: contain;">
                        <div style="font-size: 11px; line-height: 1.3;">
                            <strong>MAYUR GROCERIES</strong><br>
                            Mandiri Residence Blok G4 No. 11<br>
                            Krian - Sidoarjo | 0858 4347 4469
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <h4 style="margin: 0; font-weight: bold; text-decoration: underline;">SURAT JALAN</h4>
                        <small style="font-size: 10px;">Halaman ${hlmKe} dari ${totalHlm}</small>
                    </div>
                    <div style="text-align: left; font-size: 12px;">
                        <div style="font-size: 16px; font-weight: bold; padding: 5px; border: 2px solid #000; margin-bottom: 5px;">
                            NO: ${noSJ}
                        </div>
                        <span style="font-size: 11px;">${tglTeks}</span><br>
                        <strong>Kepada Yth.</strong><br>
                        <span style="text-transform: uppercase; font-weight: bold;">${namaCust}</span><br>
                        <div style="max-width: 250px; line-height: 1.2;">${alamatCust}</div>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 13px;">
                    <thead>
                        <tr style="text-align: center; background-color: #f2f2f2;">
                            <th style="border: 1px solid #000; padding: 10px; width: 50px;">NO</th>
                            <th style="border: 1px solid #000; padding: 10px;">JENIS PESANAN</th>
                            <th style="border: 1px solid #000; padding: 10px; width: 150px;">JUMLAH</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <table style="width: 100%; margin-top: 40px; text-align: center; font-size: 12px; border: none;" class="border-0">
                    <tr>
                        <td class="border-0" style="width: 33%;">Dibuat Oleh,<br><br><br><br>( <strong>Firman Agung</strong> )</td>
                        <td class="border-0" style="width: 33%;">Diperiksa Oleh,<br><br><br><br>( <strong>Wiwit Diana Sari</strong> )</td>
                        <td class="border-0" style="width: 33%;">Penerima,<br><br><br><br>( .......................... )</td>
                    </tr>
                </table>
                
                <hr class="no-print" style="border-top: 1px dashed #ccc; margin: 40px 0;">
            </div>`;
    });
}

// FUNGSI UNTUK UPDATE TAMPILAN SURAT JALAN SECARA REAL-TIME
function updatePreviewSJ() {
    const noSJ = document.getElementById('sj_nomor').value;
    const tglInput = document.getElementById('sj_tanggal').value;
    const alamatFull = document.getElementById('sj_alamat').value;

    // 1. Update Nomor SJ
    const pNo = document.getElementById('p_noSJ');
    if (pNo) pNo.innerText = noSJ || "......";

    // 2. Update Tanggal
    const pTgl = document.getElementById('p_lokasi_tgl');
    if (pTgl && tglInput) {
        const d = new Date(tglInput);
        const daftarBulan = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
        pTgl.innerText = `SIDOARJO, ${d.getDate()} ${daftarBulan[d.getMonth()]} ${d.getFullYear()}`;
    }

    // 3. Update Nama & Alamat (Mendukung Multi-baris)
    const pCust = document.getElementById('p_cust');
    const pAlamat = document.getElementById('p_alamat');

    if (alamatFull) {
        // Membagi teks berdasarkan baris pertama (Nama) dan sisanya (Alamat)
        const baris = alamatFull.split('\n'); 
        
        // Baris pertama masuk ke p_cust (Nama Customer)
        if (pCust) pCust.innerText = baris[0].toUpperCase();

        // Baris kedua dan seterusnya masuk ke p_alamat
        if (pAlamat) {
            if (baris.length > 1) {
                // Mengambil baris 2 sampai terakhir, lalu digabung kembali dengan <br>
                const sisaAlamat = baris.slice(1).join('<br>');
                pAlamat.innerHTML = sisaAlamat; 
            } else {
                pAlamat.innerHTML = "-";
            }
        }
    } else {
        if (pCust) pCust.innerText = "-";
        if (pAlamat) pAlamat.innerHTML = "-";
    }
}

// FUNGSI INISIALISASI (Dijalankan saat halaman pertama kali dibuka)
function inisialisasiSJ() {
    const inputTgl = document.getElementById('sj_tanggal');
    const inputNo = document.getElementById('sj_nomor');

    // Set tanggal otomatis ke hari ini
    if (inputTgl) {
        const today = new Date().toISOString().split('T')[0];
        inputTgl.value = today;
    }

    // Buat nomor surat jalan otomatis berdasarkan waktu (unik)
    if (inputNo && !inputNo.value) {
        const code = Date.now().toString().slice(-6);
        inputNo.value = "MG-" + code;
    }
    
    // Jalankan preview agar template tidak kosong saat pertama buka
    updatePreviewSJ();
}

// Pastikan inisialisasi jalan saat aplikasi siap
document.addEventListener('DOMContentLoaded', inisialisasiSJ);

// Fungsi untuk memantau data Rundown dan mengupdate Live Tracking
function aktifkanLiveTracking() {
    const container = document.getElementById('container-view-customer');
    if (!container) return;
    
    container.innerHTML = ''; 

    // databaseBelanja adalah array yang diisi dari db.ref("belanja").on("value"...)
    databaseBelanja.forEach((item) => {
        // SESUAIKAN DENGAN KODE updateStep KAMU:
        const isStep1 = item.step1 === true;
        const isStep2 = item.step2 === true;
        const isStep3 = item.step3 === true;

        container.innerHTML += `
        <div class="order-item-card mb-3 p-3 border rounded shadow-sm bg-white">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="fw-bold m-0 text-uppercase" style="font-size: 0.9rem;">
                    ${item.nama} <span class="text-muted">(${item.qtyBersih || item.jumlah} KG)</span>
                </h6>
                <span class="badge ${isStep3 ? 'bg-success' : 'bg-warning text-dark'}" style="font-size: 0.7rem;">
                    ${item.statusAlur || 'Rencana'}
                </span>
            </div>
            
            <div class="d-flex align-items-center justify-content-between px-2 mt-3">
                <div class="text-center" style="width: 60px;">
                    <div class="step-dot ${isStep1 ? 'active-blue' : ''}">1</div>
                    <div class="step-text">Belanja</div>
                </div>
                <div class="step-line ${isStep2 ? 'active-line' : ''}"></div>
                
                <div class="text-center" style="width: 60px;">
                    <div class="step-dot ${isStep2 ? 'active-orange' : ''}">2</div>
                    <div class="step-text">Proses</div>
                </div>
                <div class="step-line ${isStep3 ? 'active-line' : ''}"></div>
                
                <div class="text-center" style="width: 60px;">
                    <div class="step-dot ${isStep3 ? 'active-green' : ''}">3</div>
                    <div class="step-text">Siap</div>
                </div>
            </div>
        </div>`;
    });
}

function sinkronkanInvoice() {
    const containerUtama = document.getElementById('area-cetak-invoice');
    if (!containerUtama) return;

    // 1. Ambil data dasar dari input
    const noSJ = document.getElementById('sj_nomor')?.value || "-";
    const tglTeks = document.getElementById('p_lokasi_tgl')?.innerText || "SIDOARJO, -";
    const namaCust = document.getElementById('p_cust')?.innerText || "-";
    const alamatCust = document.getElementById('p_alamat')?.innerHTML || "-";

    // 2. Filter barang yang berstatus SIAP (Step 3)
    const itemsSiap = databaseBelanja.filter(item => item.step3 === true);
    
    if (itemsSiap.length === 0) {
        containerUtama.innerHTML = '<div class="text-center py-5">Belum ada barang siap kirim.</div>';
        return;
    }

    // 3. Pecah data menjadi kelompok per 5 item
    const perHalaman = 5;
    const kumpulanHalaman = [];
    for (let i = 0; i < itemsSiap.length; i += perHalaman) {
        kumpulanHalaman.push(itemsSiap.slice(i, i + perHalaman));
    }

    // 4. Bersihkan kontainer dan render ulang menggunakan struktur HTML asli kamu
    containerUtama.innerHTML = ''; 

    kumpulanHalaman.forEach((halamanItems, index) => {
        let grandTotalHalaman = 0;
        let rowsHtml = '';

        halamanItems.forEach((item, idx) => {
            const noUrut = (index * perHalaman) + (idx + 1);
            const qty = parseFloat(item.qtyBersih || item.jumlah || 0);
            const hargaSatuan = parseFloat(item.harga || 0);
            const subtotal = qty * hargaSatuan;
            grandTotalHalaman += subtotal;

            rowsHtml += `
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${noUrut}</td>
                    <td style="border: 1px solid #000; padding: 8px;">${item.nama.toUpperCase()}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${qty} ${item.satuan || 'KG'}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">Rp ${hargaSatuan.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">Rp ${subtotal.toLocaleString('id-ID')}</td>
                </tr>`;
        });

        // Baris kosong agar tinggi tabel tetap konsisten (minimal 5 baris)
        for (let i = halamanItems.length; i < perHalaman; i++) {
            rowsHtml += `
                <tr>
                    <td style="border: 1px solid #000; padding: 18px;">&nbsp;</td>
                    <td style="border: 1px solid #000;"></td>
                    <td style="border: 1px solid #000;"></td>
                    <td style="border: 1px solid #000;"></td>
                    <td style="border: 1px solid #000;"></td>
                </tr>`;
        }

        // Render struktur HTML asli kamu
        containerUtama.innerHTML += `
            <div class="halaman-invoice-print" style="${index > 0 ? 'page-break-before: always; margin-top: 20px;' : ''} width: 100%; color: #000; font-family: 'Arial', sans-serif; box-sizing: border-box;">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center;">
                        <div>
                            <img src="Logo.png" alt="Logo Mayur" style="height: 85px; object-fit: contain;">
                            <div style="font-size: 11px; line-height: 1.3;">
                                Mandiri Residence Blok G4 No. 11 <br> Krian - Sidoarjo
                            </div>
                        </div>
                    </div>
                    <h4 style="margin: 0; font-weight: bold; text-decoration: underline; padding: 20px;">INVOICE (TAGIHAN)</h4>
                    <div style="text-align: left;">
                        <div style="font-size: 16px; margin-top: 5px; font-weight: 600; padding: 8px; border: 2px solid #000;">
                            INV. MG: <span>${noSJ}</span> 
                        </div>
                        <span>${tglTeks}</span>
                        <div>
                            <strong>Kepada Yth.</strong><br>
                            <div style="font-weight: bold; text-transform: uppercase;">${namaCust}</div>
                            <div style="max-width: 300px; line-height: 1.2;">${alamatCust}</div>
                        </div>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 13px;">
                    <thead>
                        <tr style="text-align: center; background-color: #ebebeb;">
                            <th style="border: 1px solid #000; padding: 8px; width: 50px;">NO</th>
                            <th style="border: 1px solid #000; padding: 8px;">NAMA BARANG</th>
                            <th style="border: 1px solid #000; padding: 8px;">JUMLAH</th>
                            <th style="border: 1px solid #000; padding: 8px;">HARGA SATUAN</th>
                            <th style="border: 1px solid #000; padding: 8px;">SUBTOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold; font-size: 15px;">GRAND TOTAL HALAMAN INI :</td>
                            <td style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold; font-size: 15px; background: #f9f9f9;">
                                Rp ${grandTotalHalaman.toLocaleString('id-ID')}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div style="margin-top: 5px; font-size: 10px;">
                    <p><strong>Pembayaran via Transfer:</strong> BCA : 0123456789 a/n Wiwit Diana Sari</p>
                </div>

                <table style="width: 100%; margin-top: 10px; text-align: center; font-size: 12px; border: none !important;">
                    <tr>
                        <td style="width: 33%; border: none !important;">
                            Dibuat Oleh,<br><br><br><br>
                            ( <strong>Firman Agung</strong> )
                        </td>
                        <td style="width: 33%; border: none !important;">
                            Diperiksa Oleh,<br><br><br><br>
                            ( <strong>Wiwit Diana Sari</strong> )
                        </td>
                        <td style="width: 33%; border: none !important;">
                            Penerima,<br><br><br><br>
                            ( .......................... )
                        </td>
                    </tr>
                </table>

                <hr style="border-top: 1px dashed #ccc; margin: 20px 0;" class="no-print">
            </div>`;
    });
}

let globalShareUrlCustomer = "";

// 1. Fungsi Membuka Modal
function openShareCustomer() {
    const currentUrl = window.location.origin + window.location.pathname;
    globalShareUrlCustomer = currentUrl + "?view=customer";
    
    document.getElementById('inputShareLinkCustomer').value = globalShareUrlCustomer;
    
    const myModal = new bootstrap.Modal(document.getElementById('modalShareCustomer'));
    myModal.show();
}

// 2. Fungsi Salin Link
function copyToClipboardCustomer() {
    const copyText = document.getElementById("inputShareLinkCustomer");
    navigator.clipboard.writeText(copyText.value).then(() => {
        alert("Link berhasil disalin!");
    });
}



// 3. Fungsi Kirim WhatsApp -------------------------------------------------------------------------------------------------------------------------
function shareViaWACustomer() {
    const namaCust = document.getElementById('p_cust').innerText || "Pelanggan";
    const text = encodeURIComponent(`Halo ${namaCust}, berikut adalah link live preview pesanan Mayur Groceries Anda hari ini: ` + globalShareUrlCustomer);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

// Fungsi untuk membatasi tampilan jika diakses sebagai Customer
function proteksiHalamanCustomer() {
    const urlParams = new URLSearchParams(window.location.search);
    const modeView = urlParams.get('view');

    if (modeView === 'customer') {
        // 1. Sembunyikan Header (Nama App & Tombol Akses/Logout)
        const header = document.querySelector('.header-container') || document.querySelector('.d-flex.justify-content-between');
        if (header) header.style.display = 'none';

        // 2. Sembunyikan Navigasi Tab (Pills)
        const navTab = document.getElementById('pills-tab');
        if (navTab) navTab.style.display = 'none';

        // 3. Sembunyikan semua konten tab terlebih dahulu
        const allTabs = document.querySelectorAll('.tab-pane');
        allTabs.forEach(tab => tab.classList.remove('show', 'active'));

        // 4. Paksa tampilkan hanya Tab View Customer
        const customerTab = document.getElementById('tab-view-customer');
        if (customerTab) {
            customerTab.classList.add('show', 'active');
        }

        // 5. Tambahkan gaya khusus agar tampilan lebih bersih untuk customer
        document.body.style.backgroundColor = "#ffffff";
        
        // Opsional: Hilangkan padding/margin berlebih yang biasanya untuk admin
        const container = document.querySelector('.container');
        if (container) container.classList.remove('mt-4', 'mb-4');
    }
}

// Jalankan ini segera setelah halaman dimuat
document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const modeView = urlParams.get('view');

    // Jika masuk lewat link customer, bypass login
    if (modeView === 'customer') {
        sessionStorage.setItem("isLoggedIn", "customer"); // Set status khusus customer
        document.getElementById('loginOverlay').style.display = "none";
        proteksiHalamanCustomer(); // Panggil fungsi sembunyikan menu
    } 
    // Jika bukan customer, cek apakah admin sudah login sebelumnya
    else if (sessionStorage.getItem("isLoggedIn") === "true") {
        document.getElementById('loginOverlay').style.display = "none";
    }
});

function cekLogin() {
    const pin = document.getElementById('pinInput').value;
    if (pin === "1234") {
        sessionStorage.setItem("isLoggedIn", "true");
        document.getElementById('loginOverlay').style.display = "none";
    } else { 
        alert("PIN Salah"); 
    }
}

// Jalankan fungsi ini setiap kali halaman dimuat
window.addEventListener('load', proteksiHalamanCustomer);

function logout() {
    sessionStorage.clear();
    // Jika logout, buang semua parameter URL dan kembali ke halaman bersih
    window.location.href = window.location.origin + window.location.pathname;
}

//--------------------------------------------------------------------------------------------------------------------------------------

// 3. Fungsi SIMPAN ARSIP
async function arsipTransaksi() {
    const noInv = document.getElementById('inv_noSJ').innerText;
    const namaCust = document.getElementById('inv_cust').innerText;
    const tglInv = document.getElementById('sj_tanggal').value; // Mengambil tanggal murni yyyy-mm-dd
    const grandTotalTeks = document.getElementById('inv_grandTotal').innerText;
    const grandTotal = parseInt(grandTotalTeks.replace(/[^0-9]/g, '')); // Ubah Rp 10.000 jadi 10000

    if (namaCust === "-" || !tglInv) {
        alert("Nama Customer dan Tanggal harus diisi sebelum simpan!");
        return;
    }

    if (!confirm(`Simpan transaksi ${noInv} atas nama ${namaCust} ke riwayat penjualan?`)) return;

    // 1. Kumpulkan daftar barang yang dibeli (Array)
    const detailBarang = [];
    databaseBelanja.forEach(item => {
        if (item.step3 === true) {
            detailBarang.push({
                nama: item.nama,
                qty: item.qtyBersih || item.jumlah,
                satuan: item.satuan || 'KG',
                harga: item.harga || 0,
                subtotal: (item.qtyBersih || item.jumlah) * (item.harga || 0)
            });
        }
    });

    // 2. Siapkan Objek Data untuk Firebase
    const dataPenjualan = {
        nomor_invoice: noInv,
        tanggal: tglInv,
        customer: namaCust,
        items: detailBarang,
        total_omzet: grandTotal,
        waktu_simpan: new Date().toISOString()
    };

    try {
        // 3. Simpan ke Firebase (Gunakan push untuk ID unik otomatis)
        const refRiwayat = db.ref('Riwayat_Penjualan');
        await refRiwayat.push(dataPenjualan);

        alert("✅ Transaksi Berhasil Diarsipkan!");
        
        // Opsional: Jika ingin membersihkan tampilan setelah simpan
        // location.reload(); 
    } catch (error) {
        console.error("Gagal simpan:", error);
        alert("Gagal menyimpan transaksi ke database.");
    }
}
