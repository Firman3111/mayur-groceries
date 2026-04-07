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
// Ambil nomor terakhir dari memori browser, jika belum ada (kosong), mulai dari 20
let simpananCounter = localStorage.getItem('last_counter_sj');
window.counterSJ = simpananCounter ? parseInt(simpananCounter) : 20;

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
    // TAMBAHKAN INI DI AKHIR:
    inisialisasiModeTampilan();
});

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const modeView = urlParams.get('view');
    const overlay = document.getElementById('loginOverlay');

    // PRIORITAS UTAMA: Jika ada mode view, langsung matikan overlay
    if (modeView === 'customer' || modeView === 'karyawan') {
        if (overlay) {
            overlay.style.setProperty('display', 'none', 'important');
        }
        
        // Jalankan proteksi halaman sesuai mode
        if (modeView === 'customer') {
            proteksiHalamanCustomer();
        } else {
            // Jika ada fungsi untuk karyawan, panggil di sini
            tampilkanHalamanKaryawan(); 
        }
        return; // Berhenti di sini, jangan lanjut ke cek login admin
    }

    // LOGIKA ADMIN: Jika tidak ada parameter view
    const statusLogin = sessionStorage.getItem("isLoggedIn");
    if (statusLogin === "true") {
        if (overlay) overlay.style.setProperty('display', 'none', 'important');
    } else {
        if (overlay) overlay.style.setProperty('display', 'flex', 'important');
    }
});


//------------------------------------------------------------------------- HALAMAN OPERASIONAL ----------------------------------------------------------

// 4. FUNGSI TAMBAH ITEM (VERSI TERINTEGRASI + MARKUP NOMINAL)
function tambahItem() {
    // 1. Ambil Tanggal dari Input
    const tgl = document.getElementById('tglBarang').value;
    
    // Ambil Data Barang
    const idBarangMaster = document.getElementById('selectBarangOperasional').value;
    const selectElement = document.getElementById('selectBarangOperasional');
    
    // Validasi jika select kosong
    if (!idBarangMaster || selectElement.selectedIndex === -1) {
        alert("Mohon pilih Nama Barang!");
        return;
    }
    const namaBarangText = selectElement.options[selectElement.selectedIndex].text;
    
    const qtyKotor = parseFloat(document.getElementById('inputQtyKotor').value) || 0;
    const hargaBeli = parseFloat(document.getElementById('inputHargaBeli').value) || 0;
    const rasio = parseFloat(document.getElementById('inputRasioOperasional').value) || 1;
    const petugas = document.getElementById('selectPetugas').value;

    // 2. Logika Markup
    const markupInput = parseFloat(document.getElementById('markupItem').value) || 0;
    const tipeMarkup = document.getElementById('tipeMarkupOperasional').value;

    let hargaJualFinal = 0;
    if (tipeMarkup === "persen") {
        hargaJualFinal = hargaBeli + (hargaBeli * (markupInput / 100));
    } else {
        hargaJualFinal = hargaBeli + markupInput;
    }

    // Validasi Lengkap
    if (!tgl || qtyKotor <= 0) {
        alert("Mohon lengkapi Tanggal dan Jumlah!");
        return;
    }

    const idUnik = Date.now();
    const beratBersih = qtyKotor * rasio;

    // MENYUSUN DATA BARU
    const dataBaru = {
        id: idUnik,
        tanggal: tgl, 
        idMaster: idBarangMaster,
        nama: namaBarangText,
        harga_pokok: hargaBeli,
        markup: markupInput,
        tipe_markup: tipeMarkup,
        harga: Math.round(hargaJualFinal),
        jumlah: qtyKotor,
        rasio: rasio,
        qtyBersih: beratBersih,
        petugas: petugas || "Belum Ditunjuk",
        
        // --- MODIFIKASI UNTUK SURAT JALAN ---
        // 'status_sj' digunakan khusus untuk memfilter tampilan Surat Jalan
        status_sj: "pending", 
        
        // 'status' bawaan (untuk rundown/proses tetap "Proses")
        status: "Proses", 
        // ------------------------------------
        
        timestamp: idUnik
    };

    db.ref("belanja/" + idUnik).set(dataBaru).then(() => {
        alert("Berhasil disimpan untuk tanggal: " + tgl);
        resetForm(); 
    }).catch((error) => {
        alert("Gagal menyimpan: " + error.message);
    });
}

function resetForm() {
    // Reset input teks dan angka
    document.getElementById('selectBarangOperasional').value = '';
    document.getElementById('inputHargaBeli').value = '';
    document.getElementById('inputQtyKotor').value = '';
    document.getElementById('markupItem').value = '';
    document.getElementById('inputRasioOperasional').value = '1';
    
    // Reset tampilan visual (jika ada)
    if(document.getElementById('displayBeratBersih')) {
        document.getElementById('displayBeratBersih').innerText = '0';
    }

    // KUNCI: Jangan reset document.getElementById('tglBarang').value
    // Biarkan tetap pada tanggal yang dipilih user sebelumnya.
    console.log("Form di-reset, tapi tanggal tetap dipertahankan.");
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
                <td colspan="5" class="fw-bold small ps-3 py-2" 
                    style="background-color: #f8f9fa !important; color: #3f524a !important; font-size: 0.75rem;">
                    <i class="bi bi-calendar3"></i> JADWAL: ${item.tanggal}
                </td>
            </tr>`;
            lastDate = item.tanggal;
        }

        const total = (item.harga || 0) * (item.jumlah || 0);
        const beratBersih = item.qtyBersih ? item.qtyBersih.toFixed(2) : item.jumlah;
        const isSelesai = item.statusAlur === "Sudah Dikirim";
        const isSiap = item.step3 === true || item.step3 === "true";
        
        const styleKolom = isSelesai ? 'background-color: #d1e7dd !important;' : '';
        const styleKolomTengah = isSelesai ? 'background-color: #d1e7dd !important;' : 'background-color: #fef9e7;';

        // STATUS: Pakai Icon di HP, Teks di Laptop
        let statusHtml = `
            <div class="d-none d-md-block">
                ${isSelesai ? '<span class="badge bg-success p-2"><i class="bi bi-check-all"></i> DIKIRIM</span>' : 
                 isSiap ? '<span class="badge bg-warning text-dark p-2">SIAP</span>' : 
                 '<span class="badge bg-secondary p-2">PROSES</span>'}
            </div>
            <div class="d-md-none" style="font-size: 1.2rem;">
                ${isSelesai ? '✅' : isSiap ? '📦' : '⏳'}
            </div>
        `;

        html += `
            <tr class="border-bottom">
                <td class="ps-3 py-2" style="width: 35%; ${styleKolom}">
                    <div class="fw-bold text-dark lh-sm" style="font-size: clamp(0.85rem, 2vw, 1.1rem);">${item.nama}</div>
                    <div class="text-muted d-none d-sm-block" style="font-size: 0.7rem;">👤 ${item.petugas.toUpperCase()}</div>
                </td>

                <td class="text-center py-2" style="width: 20%; ${styleKolomTengah}">
                    <div class="fw-bold ${isSelesai ? 'text-dark' : 'text-success'}" style="font-size: clamp(1.1rem, 3vw, 1.5rem);">${item.jumlah}</div>
                    <div class="text-muted border-top border-secondary" style="font-size: 0.8rem;">${beratBersih} kg</div>
                </td>

                <td class="text-end py-2 pe-3" style="width: 20%; ${styleKolom}">
                    <div class="fw-bold" style="font-size: clamp(0.8rem, 2vw, 1rem);">Rp ${total.toLocaleString('id-ID')}</div>
                    <div class="text-muted d-none d-sm-block" style="font-size: 0.65rem;">@${item.harga.toLocaleString('id-ID')}</div>
                </td>

                <td class="text-center py-2" style="width: 10%; ${styleKolom}">
                    ${statusHtml}
                </td>

                <td class="text-center py-2 pe-2" style="width: 15%; ${styleKolom}">
                    <div class="btn-group shadow-sm bg-white p-1 border rounded">
                        <button onclick="bukaModalHarga('${item.id}', '${item.nama}', ${item.harga_pokok || item.harga}, ${item.markup || 0})" 
                                class="btn btn-sm btn-light border-0 p-1 px-sm-2">
                            ✏️
                        </button>
                        <button onclick="hapusItem('${item.id}')" class="btn btn-sm btn-outline-danger border-0 p-1 px-sm-2 d-none d-sm-inline-block">✕</button>
                        <div class="d-flex align-items-center px-1 px-sm-2 border-start ms-1">
                            <input type="checkbox" class="form-check-input check-item m-0" value="${item.id}" onchange="updateTampilanTombolHapus()" style="width: 1.2rem; height: 1.2rem;">
                        </div>
                    </div>
                </td>
            </tr>`;
    });
    container.innerHTML = html || '<tr><td colspan="5" class="text-center py-5">Belum ada jadwal.</td></tr>';
}

// 1. Fungsi Membuka Modal (Memasukkan data ke dalam form modal)
function bukaModalHarga(id, nama, hargaPokok, markup) {
    // Pastikan ID ini ada di HTML Anda
    document.getElementById('editItemId').value = id;
    document.getElementById('editItemNama').value = nama;
    document.getElementById('editHargaPokok').value = hargaPokok || 0;
    document.getElementById('editNilaiMarkup').value = markup || 0;
    document.getElementById('editTipeMarkup').value = "persen"; 

    hitungHargaFinal(); // Hitung angka awal agar tidak Rp 0 saat buka

    const modalEdit = new bootstrap.Modal(document.getElementById('modalEditHarga'));
    modalEdit.show();
}

// 2. Fungsi Hitung Otomatis (Logika Persen vs Nominal)
function hitungHargaFinal() {
    const hp = parseFloat(document.getElementById('editHargaPokok').value) || 0;
    const markup = parseFloat(document.getElementById('editNilaiMarkup').value) || 0;
    const tipe = document.getElementById('editTipeMarkup').value;
    
    let total = 0;
    if (tipe === "persen") {
        total = hp + (hp * (markup / 100));
    } else {
        total = hp + markup;
    }

    // Update tampilan Rp di kotak biru modal
    document.getElementById('displayHargaFinal').innerText = "Rp " + Math.round(total).toLocaleString('id-ID');
    return Math.round(total);
}

// 3. Fungsi Simpan (Eksekusi ke Firebase)
function simpanPerubahanHarga() {
    const id = document.getElementById('editItemId').value;
    const hp = parseFloat(document.getElementById('editHargaPokok').value) || 0;
    const markup = parseFloat(document.getElementById('editNilaiMarkup').value) || 0;
    const hargaFinal = hitungHargaFinal(); // Ambil harga hasil perhitungan

    db.ref("belanja/" + id).update({
        harga_pokok: hp,
        markup: markup,
        harga: hargaFinal 
    }).then(() => {
        // Tutup modal
        const modalEl = document.getElementById('modalEditHarga');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();
        console.log("Update Sukses!");
    }).catch((err) => alert("Gagal: " + err.message));
}


// 1. Variabel Global di paling atas
const tglHariIni = new Date().toISOString().split('T')[0];

// 2. Fungsi Ambil Data Belanja Hari Ini (Modifikasi Baru)
function inisialisasiDataHarian() {
    // KITA HAPUS .equalTo(tglHariIni) agar Admin bisa melihat SEMUA jadwal
    db.ref("belanja")
      .orderByChild("tanggal")
      .limitToLast(100) // Ambil 100 transaksi terakhir agar tidak berat
      .on("value", (snapshot) => {
          const data = [];
          snapshot.forEach((child) => {
              data.push(child.val());
          });
          
          // Simpan ke variabel global
          window.databaseBelanjaHarian = data; 
          
          // Tampilkan di Tabel Jadwal (Admin melihat SEMUA)
          renderTabelHarian(data);
          
          // Tampilkan di Rundown (Fungsi Rundown nanti yang akan memfilter "Hari Ini")
          renderRundown(data);
      });
}

// 3. Fungsi Isi Dropdown Barang (Tetap Diperlukan)
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

// 4. Jalankan Keduanya saat Halaman Dibuka
window.addEventListener('load', () => {
    loadMasterKeOperasional(); 
    inisialisasiDataHarian();   
    
    const inputTgl = document.getElementById('tglBarang');
    if (inputTgl) {
        // HANYA isi ke hari ini jika inputTgl masih kosong
        if (!inputTgl.value) {
            inputTgl.value = tglHariIni;
        }
        // Jika sudah ada isinya (karena tidak di-reset oleh resetForm), 
        // biarkan saja, jangan dipaksa balik ke hari ini.
    }
});

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
let labaKotorTerakhir = 0;

function renderJurnal(dataArr) {
    const container = document.getElementById('jurnal-container');
    if (!container || !dataArr) return;

    let html = `<div class="table-responsive rounded-3 shadow-sm bg-white border">
                <table class="table table-hover align-middle m-0">
                <thead class="bg-success text-white small text-uppercase">
                    <tr>
                        <th class="ps-3 py-3">Tanggal & Item</th>
                        <th class="text-center">Modal</th>
                        <th class="text-center">Markup</th>
                        <th class="text-end pe-3">Tagihan</th>
                    </tr>
                </thead><tbody>`;

    let totalModal = 0;
    let totalTagihan = 0;
    const sortedData = [...dataArr].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    sortedData.forEach(item => {
        const modal = (parseFloat(item.harga_pokok) || 0) * (parseFloat(item.jumlah) || 0);
        const qtyBersih = parseFloat(item.qtyBersih) || parseFloat(item.jumlah) || 0;
        const markupVal = parseFloat(item.markup) || 0;
        let tagihan = (item.tipe_markup === "nominal") ? modal + (markupVal * qtyBersih) : modal * (1 + (markupVal / 100));
        let infoMarkup = (item.tipe_markup === "nominal") ? `Rp ${markupVal.toLocaleString('id-ID')}/kg` : `${markupVal}%`;

        totalModal += modal;
        totalTagihan += tagihan;

        html += `<tr class="border-bottom">
            <td class="ps-3 py-3">
                <div class="text-muted" style="font-size: 0.7rem;">${item.tanggal || '-'}</div>
                <div class="fw-bold text-dark">${item.nama.toUpperCase()}</div>
                <div class="small text-muted">Net: ${qtyBersih.toFixed(2)} ${item.satuan || 'KG'}</div>
            </td>
            <td class="text-center text-secondary small">Rp ${modal.toLocaleString('id-ID')}</td>
            <td class="text-center"><span class="badge rounded-pill text-dark px-3" style="background-color: #ffc107; font-size: 0.7rem;">${infoMarkup}</span></td>
            <td class="text-end fw-bold text-success pe-3">Rp ${tagihan.toLocaleString('id-ID')}</td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    container.innerHTML = html;

    labaKotorTerakhir = totalTagihan - totalModal;
    renderAreaKalkulasiLaba(labaKotorTerakhir);
}

function renderAreaKalkulasiLaba(labaKotor) {
    const summaryContainer = document.getElementById('summary-laba-container');
    if (!summaryContainer) return;

    summaryContainer.innerHTML = `
        <div class="row g-4 mt-2">
            <div class="col-md-4">
                <div class="card border-0 shadow-sm border-top border-primary border-4">
                    <div class="card-header bg-white py-3">
                        <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-calendar-plus me-2 text-primary"></i> CATAT PENGELUARAN</h6>
                    </div>
                    <div class="card-body p-4">
                        <div class="mb-3">
                            <label class="form-label small mb-1">Tanggal Biaya</label>
                            <input type="date" id="in-tgl-biaya" class="form-control form-control-sm">
                        </div>
                        <div class="mb-3">
                            <label class="form-label small mb-1">Bensin & Transportasi</label>
                            <input type="number" id="in-bensin" class="form-control" placeholder="0">
                        </div>
                        <div class="mb-3">
                            <label class="form-label small mb-1">Sewa/Gudang</label>
                            <input type="number" id="in-sewa" class="form-control" placeholder="0">
                        </div>
                        <div class="p-3 bg-light rounded border mb-3">
                            <label class="form-label small mb-1">Biaya Lain-lain</label>
                            <input type="text" id="in-nama-lain" class="form-control form-control-sm mb-2" placeholder="Nama Biaya">
                            <input type="number" id="in-jumlah-lain" class="form-control form-control-sm" placeholder="0">
                        </div>
                        <button onclick="simpanBiayaHarian()" class="btn btn-primary w-100 fw-bold">
                            <i class="bi bi-plus-circle me-2"></i> TAMBAHKAN KE DAFTAR
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-md-8">
                <div id="container-tabel-biaya"></div>
                <div id="container-ringkasan-akhir" class="mt-4"></div>
            </div>
        </div>`;

    document.getElementById('in-tgl-biaya').valueAsDate = new Date();
    loadTabelBiayaHarian();
}

function simpanBiayaHarian() {
    const tgl = document.getElementById('in-tgl-biaya').value;
    const bensin = parseFloat(document.getElementById('in-bensin').value) || 0;
    const sewa = parseFloat(document.getElementById('in-sewa').value) || 0;
    const lain = parseFloat(document.getElementById('in-jumlah-lain').value) || 0;
    const namaLain = document.getElementById('in-nama-lain').value || "-";

    if (!tgl) return alert("Pilih tanggal!");

    const dataBiaya = {
        tanggal: tgl, bensin, sewa, 
        tambahan: { nama: namaLain, jumlah: lain },
        total: bensin + sewa + lain,
        timestamp: new Date().getTime()
    };

    db.ref('BiayaHarian').push(dataBiaya).then(() => {
        alert("✅ Berhasil dicatat!");
        document.querySelectorAll('#in-bensin, #in-sewa, #in-jumlah-lain, #in-nama-lain').forEach(el => el.value = "");
    });
}

function loadTabelBiayaHarian() {
    const tableContainer = document.getElementById('container-tabel-biaya');
    db.ref('BiayaHarian').orderByChild('tanggal').on('value', snapshot => {
        if (!snapshot.exists()) {
            tableContainer.innerHTML = `<div class="alert alert-light border text-center">Belum ada catatan.</div>`;
            updateKalkulasiAkhir({ labaKotor: labaKotorTerakhir, totalPengeluaran: 0, labaBersihRiil: labaKotorTerakhir });
            return;
        }

        let totalSeluruhBiaya = 0;
        let rows = "";
        snapshot.forEach(child => {
            const val = child.val();
            totalSeluruhBiaya += val.total;
            rows += `<tr>
                <td class="fw-bold">${val.tanggal.split('-').reverse().slice(0,2).join('/')}</td>
                <td>Rp ${val.bensin.toLocaleString('id-ID')}</td>
                <td>Rp ${val.sewa.toLocaleString('id-ID')}</td>
                <td class="small text-muted">${val.tambahan.nama}: Rp ${val.tambahan.jumlah.toLocaleString('id-ID')}</td>
                <td class="text-end pe-3 fw-bold text-danger">Rp ${val.total.toLocaleString('id-ID')}</td>
            </tr>`;
        });

        tableContainer.innerHTML = `
            <div class="card border-0 shadow-sm">
                <div class="table-responsive" style="max-height: 250px;">
                    <table class="table table-hover align-middle mb-0" style="font-size: 0.85rem;">
                        <thead class="table-light"><tr><th>Tgl</th><th>Bensin</th><th>Sewa</th><th>Lainnya</th><th class="text-end">Total</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;

        const tglMulai = document.getElementById('filter-tgl-mulai').value || "-";
        const tglSelesai = document.getElementById('filter-tgl-selesai').value || "-";

        updateKalkulasiAkhir({
            periode: `${tglMulai} s/d ${tglSelesai}`,
            labaKotor: labaKotorTerakhir,
            totalPengeluaran: totalSeluruhBiaya,
            labaBersihRiil: labaKotorTerakhir - totalSeluruhBiaya
        });
    });
}

function updateKalkulasiAkhir(dataBiaya) {
    const finalContainer = document.getElementById('container-ringkasan-akhir');
    if (!finalContainer) return;

    finalContainer.innerHTML = `
        <div class="card border-0 shadow-sm bg-white rounded-4 overflow-hidden border-top border-primary border-4 no-print">
            <div class="card-body p-4">
                <div class="d-flex flex-column-reverse flex-md-row align-items-center">
                    
                    <div class="col-md-8 col-12 border-md-end pe-md-4 mt-4 mt-md-0">
                        <div class="mb-3">
                            <span class="badge bg-primary-subtle text-primary mb-2">Periode: ${dataBiaya.periode || '-'}</span>
                            <h5 class="fw-bold text-dark mb-4 text-uppercase">Hasil Laba Bersih Riil</h5>
                        </div>

                        <div class="d-flex justify-content-between mb-2">
                            <span class="text-muted">Total Penjualan</span>
                            <span class="fw-bold text-dark">Rp ${dataBiaya.labaKotor.toLocaleString('id-ID')}</span>
                        </div>
                        
                        <div class="d-flex justify-content-between mb-3 text-danger">
                            <span class="text-muted">Total Pengeluaran</span>
                            <span class="fw-bold">(-) Rp ${dataBiaya.totalPengeluaran.toLocaleString('id-ID')}</span>
                        </div>
                        
                        <hr>
                        
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <span class="fw-bold h6 mb-0 text-secondary">KEUNTUNGAN BERSIH</span>
                            <span class="h2 fw-bold mb-0 text-primary">Rp ${dataBiaya.labaBersihRiil.toLocaleString('id-ID')}</span>
                        </div>

                        <div class="row g-2 mt-3 no-print">
                            <div class="col-6">
                                <button onclick="simpanLaporanFinalKeFirebase()" class="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                                    <i class="bi bi-cloud-arrow-up-fill me-2"></i> FIREBASE
                                </button>
                            </div>
                            <div class="col-6">
                                <button onclick="unduhPDFLaporan()" class="btn btn-danger w-100 py-2 fw-bold shadow-sm">
                                    <i class="bi bi-file-earpdf-fill me-2"></i> UNDUH PDF
                                </button>
                            </div>
                        </div>

                        <p class="mt-3 mb-0 text-muted small italic">
                            <i class="bi bi-info-circle-fill me-1"></i> Data diperbarui otomatis dari database Firebase.
                        </p>
                    </div>
                    
                    <div class="col-md-4 col-12 text-center mb-4 mb-md-0">
                        <div class="chart-wrapper" style="position: relative; height: 220px; width: 100%;">
                            <canvas id="finalDonutChart"></canvas>
                        </div>
                        <div class="mt-2 no-print">
                            <small class="text-muted fw-bold" style="font-size: 0.7rem;">KOMPOSISI KEUANGAN</small>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    `;

    // Render Chart dengan delay kecil agar elemen canvas siap di DOM
    setTimeout(() => {
        renderFinalChart(dataBiaya.labaKotor, dataBiaya.totalPengeluaran);
    }, 150);
}

// Pastikan variabel global ini ada di paling atas file JS Anda
let myFinalChart = null; 

function renderFinalChart(penjualan, biaya) {
    const canvas = document.getElementById('finalDonutChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    
    // Hitung Sisa Laba (Jika Rugi, set ke 0 agar chart tidak error)
    const sisaLaba = penjualan > biaya ? penjualan - biaya : 0;

    // Hancurkan chart lama agar tidak bentrok (Menghindari Error Canvas sudah digunakan)
    if (myFinalChart) {
        myFinalChart.destroy();
    }

    // Buat Chart Baru
    myFinalChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Untung Bersih', 'Biaya Ops'],
            datasets: [{
                data: [sisaLaba, biaya],
                // --- PERUBAHAN 1: GANTI WARNA (Hijau & Oranye) ---
                backgroundColor: [
                    '#198754', // Hijau Success (Bootstrap)
                    '#fd7e14'  // Oranye Warning (Bootstrap)
                ],
                borderWidth: 2,
                borderColor: '#ffffff', // Beri sedikit border putih agar elegan
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // Matikan animasi agar saat di-unduh PDF, grafik sudah "diam"
            animation: false, 
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { 
                        boxWidth: 12, 
                        font: { size: 11 },
                        padding: 15
                    }
                },
                // Optional: Tambahkan tooltip agar angka muncul saat di-hover
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed !== null) {
                                label += 'Rp ' + context.parsed.toLocaleString('id-ID');
                            }
                            return label;
                        }
                    }
                }
            },
            // --- PERUBAHAN 2: BUAT DONAT LEBIH TEBAL (Kecilkan Cutout) ---
            // Nilai lama mungkin 75%, kita ubah jadi 55% agar tebal seperti Pie tapi tetap berlubang
            cutout: '55%' 
        }
    });
}

function simpanLaporanFinalKeFirebase() {
    // 1. Ambil data dari input biaya (jika ada)
    const bensin = parseFloat(document.getElementById('in-bensin')?.value) || 0;
    const sewa = parseFloat(document.getElementById('in-sewa')?.value) || 0;
    const jumlahLain = parseFloat(document.getElementById('in-jumlah-lain')?.value) || 0;
    const namaLain = document.getElementById('in-nama-lain')?.value || "Lain-lain";
    
    // 2. Ambil periode dari filter tanggal
    const tglMulai = document.getElementById('filter-tgl-mulai')?.value;
    const tglSelesai = document.getElementById('filter-tgl-selesai')?.value;

    if (!tglMulai || !tglSelesai) {
        return alert("Harap tentukan rentang tanggal (Filter) terlebih dahulu!");
    }

    const totalBiaya = bensin + sewa + jumlahLain;

    // 3. Susun objek data sesuai struktur database Anda
    const dataLaporan = {
        periode: `${tglMulai} s/d ${tglSelesai}`,
        labaKotor: labaKotorTerakhir, // Diambil dari variabel global
        biayaOperasional: {
            bensin: bensin,
            sewa: sewa,
            tambahan: { nama: namaLain, jumlah: jumlahLain }
        },
        totalPengeluaran: totalBiaya,
        labaBersihRiil: labaKotorTerakhir - totalBiaya,
        tanggalSimpan: new Date().toISOString()
    };

    // 4. Proses Simpan ke Firebase
    // Pastikan 'db' adalah variabel firebase.database() Anda
    db.ref('LaporanFinal').push(dataLaporan)
        .then(() => {
            alert("✅ Laporan Berhasil Diarsipkan!");
        })
        .catch((error) => {
            console.error("Firebase Error:", error);
            alert("Gagal menyimpan: " + error.message);
        });
}

function unduhPDFLaporan() {
    // Mengambil elemen berdasarkan Class karena di HTML Anda tidak ada ID khusus
    const element = document.querySelector('.area-cetak-jurnal'); 
    
    const tglMulai = document.getElementById('filter-tgl-mulai')?.value || "Laporan";
    const tglSelesai = document.getElementById('filter-tgl-selesai')?.value || "Periode";

    if (!element) {
        return alert("Error: Area cetak '.area-cetak-jurnal' tidak ditemukan!");
    }

    const opsi = {
        margin:       [10, 10, 10, 10],
        filename:     `Laporan_Jurnal_${tglMulai}_sd_${tglSelesai}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            // Memastikan background putih ikut tercetak
            backgroundColor: '#ffffff' 
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Tombol Loading
    const btn = event.currentTarget;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> PROSES...';
    btn.disabled = true;

    html2pdf().set(opsi).from(element).save().then(() => {
        btn.innerHTML = '<i class="bi bi-file-earpdf-fill me-2"></i> SIMPAN PDF';
        btn.disabled = false;
    }).catch(err => {
        alert("Gagal: " + err.message);
        btn.disabled = false;
    });
}

async function unduhPDFLaporan() {
    const element = document.querySelector('.area-cetak-jurnal');
    
    // Pastikan elemen ada dan tidak kosong
    if (!element || element.innerText.includes("Silakan pilih tanggal")) {
        return alert("Data belum difilter atau tabel masih kosong!");
    }

    const btn = event.currentTarget;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> MENYIAPKAN...';
    btn.disabled = true;

    // Tambahkan jeda 500ms agar browser "tenang" setelah render JS
    await new Promise(resolve => setTimeout(resolve, 500));

    const opsi = {
        margin:       [10, 10, 10, 10],
        filename:     `Laporan_Full.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            letterRendering: true, // Membantu merender teks dari JS lebih akurat
            scrollY: 0 // Mencegah bagian atas terpotong jika halaman di-scroll
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opsi).from(element).save().then(() => {
        btn.innerHTML = '<i class="bi bi-file-earpdf-fill me-2"></i> SIMPAN PDF';
        btn.disabled = false;
    });
}

function jalankanFilterJurnal() {
    const tglMulai = document.getElementById('filter-tgl-mulai').value;
    const tglSelesai = document.getElementById('filter-tgl-selesai').value;

    if (!tglMulai || !tglSelesai) return alert("Pilih tanggal dulu!");

    const dataFiltered = databaseBelanja.filter(item => {
        return item.tanggal >= tglMulai && item.tanggal <= tglSelesai;
    });

    if (dataFiltered.length === 0) {
        document.getElementById('jurnal-container').innerHTML = "<p class='text-center'>Data tidak ditemukan.</p>";
        return;
    }

    renderJurnal(dataFiltered);
}

// Fungsi pembantu untuk format tanggal agar rapi di laporan
function formatTanggalIndo(tgl) {
    if(!tgl) return "-";
    const opsi = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(tgl).toLocaleDateString('id-ID', opsi);
}


//------------------------------------------------------------------------- HALAMAN RUNDOWN ----------------------------------------------------------

function renderRundown(dataArr) {
    const container = document.getElementById('rundown-container');
    if (!container || !dataArr) return;

    // --- MODIFIKASI: Ambil tanggal dari input filter agar tidak kaku ---
    const filterInput = document.getElementById('filterTglRundown');
    const tglTarget = filterInput ? filterInput.value : tglHariIni;

    // 1. FILTER: Gunakan tglTarget agar rundown mengikuti pilihan kalender
    const dataAktif = dataArr.filter(item => 
        !item.nama.includes("[BIAYA]") && 
        item.tanggal === tglTarget && // Menggunakan tglTarget
        item.statusAlur !== "Sudah Dikirim"
    );

    // 2. GROUPING: (Tetap menggunakan logika reduce Anda yang sudah aman)
    const grouped = dataAktif.reduce((acc, item) => {
        const namaPetugas = item.petugas || "Tanpa Nama";
        if (!acc[namaPetugas]) {
            acc[namaPetugas] = []; 
        }
        acc[namaPetugas].push(item);
        return acc;
    }, {}); 

    // Jika data kosong setelah difilter
    if (Object.keys(grouped).length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <h1 class="display-1">✅</h1>
                <h4 class="text-muted mt-3">Rundown Bersih</h4>
                <p>Tidak ada tugas aktif untuk tanggal ${tglTarget}.</p>
            </div>`;
        return;
    }

    // 3. RENDER HTML (Lanjutkan dengan kode UI Anda yang sudah keren)
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
        const daftarTugas = grouped[petugas];
        const totalTugas = daftarTugas.length;
        const tugasSelesai = daftarTugas.filter(item => item.step3 === true).length;

        html += `
        <div class="col-md-6 col-lg-4 mb-3 card-petugas" data-nama="${petugas}">
            <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div class="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center" 
                     style="cursor: pointer;" 
                     data-bs-toggle="collapse" 
                     data-bs-target="#${idCollapse}">
                    <div>
                        <h6 class="m-0 fw-bold text-success">👤 ${petugas.toUpperCase()}</h6>
                        <small class="text-muted">${tugasSelesai}/${totalTugas} Selesai</small>
                    </div>
                    <span class="badge rounded-pill ${tugasSelesai === totalTugas ? 'bg-success' : 'bg-warning text-dark'}">
                        ${tugasSelesai === totalTugas ? '✓' : '●'}
                    </span>
                </div>
                <div class="collapse ${index === 0 ? 'show' : ''}" id="${idCollapse}">
                    <div class="list-group list-group-flush border-top">`;

        daftarTugas.forEach(item => {
            const qcDone = item.qcKualitas && item.qcBerat && item.qcPacking;
            const isBelanja = item.step1;
            const isProses = item.step2;
            const isSiap = item.step3;

            let bgColor = "#ffffff";
            if (isSiap) bgColor = "#f1f3f5"; 
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

document.addEventListener('DOMContentLoaded', () => {
    const filterTgl = document.getElementById('filterTglRundown');
    
    if (filterTgl) {
        // 1. Set default ke tanggal hari ini (agar sinkron dengan sistem)
        const today = new Date().toISOString().split('T')[0];
        filterTgl.value = today;

        // 2. Pasang Event Listener (Cukup di sini saja)
        filterTgl.addEventListener('change', () => {
            // Pastikan databaseBelanja sudah terisi dari Firebase
            renderRundown(databaseBelanja);
        });
    }
});


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

    // HANYA beri notifikasi jika item tersebut adalah transaksi HARI INI
    if (item.tanggal !== tglHariIni) return;

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

//---------------------------------------------------------------------------------------------------------------------------------------------

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
    // 1. Ambil info header dari input form
    const noSJ = document.getElementById('noSuratJalan')?.value || "-";
    const customer = document.getElementById('namaCustomer')?.value || "-";
    const alamat = document.getElementById('alamatCustomer')?.value || "-";
    
    // Format Tanggal: Sidoarjo, 04 April 2026
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    const tglFormatted = "Sidoarjo, " + new Date().toLocaleDateString('id-ID', options);

    // Update Teks di Elemen Preview (elemen yang akan di-print)
    if(document.getElementById('p_noSJ')) document.getElementById('p_noSJ').innerText = noSJ;
    if(document.getElementById('p_tgl')) document.getElementById('p_tgl').innerText = tglFormatted;
    if(document.getElementById('p_cust')) document.getElementById('p_cust').innerText = customer;
    if(document.getElementById('p_alamat')) document.getElementById('p_alamat').innerText = alamat;
    
    // 2. FILTER DATA: Ambil hanya yang SIAP tapi BELUM berstatus "Sudah Dikirim"
    const itemsSiapCetak = (window.databaseBelanjaHarian || []).filter(item => 
        item.step3 === true && 
        item.statusAlur !== "Sudah Dikirim" &&
        // --- TAMBAHKAN FILTER INI ---
        (item.status_sj === "pending" || item.status_sj === undefined)
    );

    const tbody = document.getElementById('listKirim');
    if (!tbody) return;

    let html = '';
    
    // 3. Render Item yang lolos filter ke dalam tabel
    itemsSiapCetak.forEach((item, index) => {
        // Gunakan qtyBersih untuk berat netto yang akurat
        const berat = item.qtyBersih ? Number(item.qtyBersih).toFixed(2) : "0.00";
        
        html += `
            <tr>
                <td class="text-center border-dark" style="width: 50px;">${index + 1}</td>
                <td class="border-dark fw-bold">${item.nama}</td>
                <td class="text-center border-dark fw-bold" style="width: 100px;">${berat}</td>
                <td class="text-center border-dark" style="width: 60px;">kg</td>
            </tr>`;
    });

    // 4. Logika Baris Kosong (Min 6 Baris) agar Surat Jalan terlihat profesional
    const minBaris = 6;
    if (itemsSiapCetak.length < minBaris) {
        for (let i = itemsSiapCetak.length; i < minBaris; i++) {
            html += `
                <tr>
                    <td class="border-dark text-white text-center">${i + 1}</td>
                    <td class="border-dark">&nbsp;</td>
                    <td class="border-dark">&nbsp;</td>
                    <td class="border-dark">&nbsp;</td>
                </tr>`;
        }
    }
    
    tbody.innerHTML = html;

    // 5. Kunci Sinkronisasi: Update variabel global untuk proses 'Cetak & Potong Stok'
    // Jika list kosong, maka tombol Cetak di fungsi sebelah akan memberikan alert "Tidak ada barang"
    window.itemsAkanDicetak = itemsSiapCetak;
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

function sinkronkanSuratJalan() {
    const containerUtama = document.getElementById('area-cetak'); 
    if (!containerUtama) return;

    // --- MODIFIKASI FILTER DISINI ---
    // Menambahkan pengecekan status_sj agar tidak terjadi penumpukan data lama
    const itemsSiap = databaseBelanja.filter(item => 
        item.step3 === true && 
        (item.status_sj === "pending" || item.status_sj === undefined)
    );
    // --------------------------------
    
    if (itemsSiap.length === 0) {
        containerUtama.innerHTML = `
            <div class="text-center py-5 no-print">
                <div class="text-muted mb-2">Belum ada barang yang berstatus SIAP (Pending).</div>
                <small class="text-danger">Pastikan Step 3 di Rundown sudah dicentang dan item belum dikirim sebelumnya.</small>
            </div>`;
        return;
    }

    // 1. Ambil data header
    const noSJRaw = document.getElementById('sj_nomor')?.value || "";
    const tglInput = document.getElementById('sj_tanggal')?.value;
    const alamatFull = document.getElementById('sj_alamat')?.value || "";

    const prefixMG = noSJRaw.substring(0, 5); 
    let angkaUrutMulai = parseInt(noSJRaw.substring(5)) || 0;

    let tglTeks = "-";
    if (tglInput) {
        const d = new Date(tglInput);
        const daftarBulan = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
        tglTeks = `SIDOARJO, ${d.getDate()} ${daftarBulan[d.getMonth()]} ${d.getFullYear()}`;
    }

    let namaCust = "-";
    let alamatCust = "-";
    if (alamatFull) {
        const baris = alamatFull.split('\n'); 
        namaCust = baris[0].toUpperCase();
        alamatCust = baris.length > 1 ? baris.slice(1).join('<br>') : "-";
    }

    const perHalaman = 5;
    const kumpulanHalaman = [];
    for (let i = 0; i < itemsSiap.length; i += perHalaman) {
        kumpulanHalaman.push(itemsSiap.slice(i, i + perHalaman));
    }

    // 2. Reset container
    containerUtama.innerHTML = ''; 
    containerUtama.style.background = 'transparent';
    containerUtama.style.border = 'none';
    containerUtama.style.padding = '0';

    kumpulanHalaman.forEach((halamanItems, index) => {
        const hlmKe = index + 1;
        const totalHlm = kumpulanHalaman.length;
        const noSJFinal = prefixMG + (angkaUrutMulai + index).toString().padStart(2, '0');

        let rowsHtml = '';
        halamanItems.forEach((item, idx) => {
            const noUrut = (index * perHalaman) + (idx + 1);
            // Gunakan qtyBersih jika ada, jika tidak gunakan jumlah biasa
            const displayQty = item.qtyBersih ? Number(item.qtyBersih).toFixed(2) : (item.jumlah || 0);
            
            rowsHtml += `
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${noUrut}</td>
                    <td style="border: 1px solid #000; padding: 8px 12px; text-transform: uppercase; font-weight: bold;">${item.nama}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">
                        ${displayQty} KG
                    </td>
                </tr>`;
        });

        // Baris kosong penyeimbang
        for (let i = halamanItems.length; i < perHalaman; i++) {
            rowsHtml += `<tr><td style="border: 1px solid #000; padding: 18px;">&nbsp;</td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>`;
        }

        // 3. Render Struktur
        containerUtama.innerHTML += `
            <div class="halaman-surat-jalan-print" style="${index > 0 ? 'page-break-before: always;' : ''} width: 100%; color: #000; font-family: Arial, sans-serif; background: white; padding: 25px;">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        
                        <div style="font-size: 11px; line-height: 1.3;">
                            <strong style="font-size: 14px;">MAYUR GROCERIES</strong><br>
                            Mandiri Residence Blok G4 No. 11 Krian - Sidoarjo<br>
                            wiwitdianasari@gmail.com | 0858 4347 4469
                        </div>
                    </div>

                    <div style="flex: 1; text-align: center; padding-top: 10px;">
                        <h3 style="margin: 0; font-weight: bold; text-decoration: underline; font-size: 20px; letter-spacing: 2px;">SURAT JALAN</h3>
                        <small style="font-size: 11px;">Halaman ${hlmKe} dari ${totalHlm}</small>
                    </div>

                    <div style="flex: 1; display: flex; justify-content: flex-end;">
                        <div style="text-align: left; min-width: 200px;">
                            <div style="font-size: 16px; font-weight: bold; padding: 8px; border: 2.5px solid #000; margin-bottom: 10px; text-align: center;">
                                NO. MG: ${noSJFinal}
                            </div>
                            <div style="font-weight: bold; font-size: 13px;">${tglTeks}</div>
                            <div style="font-size: 13px; margin-top: 5px;">
                                <strong>Kepada Yth.</strong><br>
                                <span style="text-transform: uppercase; font-weight: bold;">${namaCust}</span><br>
                                <div style="line-height: 1.2;">${alamatCust}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 13px; margin-top: 30px;">
                    <thead>
                        <tr style="text-align: center; background-color: #f2f2f2;">
                            <th style="border: 1px solid #000; padding: 10px; width: 50px;">NO</th>
                            <th style="border: 1px solid #000; padding: 10px;">JENIS PESANAN</th>
                            <th style="border: 1px solid #000; padding: 10px; width: 150px;">JUMLAH</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>

                <table style="width: 100%; margin-top: 50px; text-align: center; font-size: 13px; border: none !important;">
                    <tr>
                        <td style="border: none !important; width: 33%;">Dibuat Oleh,<br><br><br><br>( <strong>Firman Agung</strong> )</td>
                        <td style="border: none !important; width: 33%;">Diperiksa Oleh,<br><br><br><br>( <strong>Wiwit Diana Sari</strong> )</td>
                        <td style="border: none !important; width: 33%;">Penerima,<br><br><br><br>( .......................... )</td>
                    </tr>
                </table>

                <hr style="border-top: 1px dashed #ccc; margin: 30px 0;" class="no-print">
            </div>`;
    });

    // Simpan data yang sedang tampil ke variabel global agar bisa di-update statusnya saat cetak
    window.itemsAkanDicetak = itemsSiap;
}

function aktifkanLiveTracking() {
    const container = document.getElementById('container-view-customer');
    if (!container) return;
    
    container.innerHTML = ''; 

    // --- MODIFIKASI FILTER DISINI ---
    // Hanya tampilkan barang yang belum berstatus "Sudah Dikirim"
    // Ini agar tampilan customer bersih dari riwayat pengiriman lama
    const dataAktif = databaseBelanja.filter(item => 
        item.statusAlur !== "Sudah Dikirim" && 
        item.status_sj !== "dikirim"
    );

    dataAktif.forEach((item) => {
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

    // Jika kosong, berikan pesan manis untuk customer
    if (dataAktif.length === 0) {
        container.innerHTML = '<div class="text-center py-5 text-muted">Belum ada pesanan aktif saat ini.</div>';
    }
}

// 1. FUNGSI INISIALISASI (Dijalankan saat halaman pertama kali dibuka)
function inisialisasiSJ() {
    const inputTgl = document.getElementById('sj_tanggal');
    const inputNo = document.getElementById('sj_nomor');

    // Set tanggal otomatis ke hari ini (Hanya sekali saat buka)
    if (inputTgl && !inputTgl.value) {
        const today = new Date().toISOString().split('T')[0];
        inputTgl.value = today;
    }

    // Nomor SJ dikosongkan/dibuat statis agar tidak acak (Hapus Date.now)
    if (inputNo && !inputNo.value) {
        inputNo.value = "0142615"; // Nilai awal contoh
    }
    
    // Langsung sinkronkan tampilan
    sinkronkanSuratJalan();
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
    const tglInput = document.getElementById('sj_tanggal')?.value;
    let tglTeks = "SIDOARJO, -";
    if (tglInput) {
        const d = new Date(tglInput);
        const daftarBulan = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
        tglTeks = `SIDOARJO, ${d.getDate()} ${daftarBulan[d.getMonth()]} ${d.getFullYear()}`;
    }
    const alamatCust = document.getElementById('sj_alamat')?.value || "-";
    const namaCust = document.getElementById('p_cust')?.value|| "-";
    

    // 2. KUNCI PERBAIKAN: Filter barang yang SIAP (Step 3) DAN belum dikirim (status_sj pending)
    const itemsSiap = databaseBelanja.filter(item => 
        item.step3 === true && 
        (item.status_sj === "pending" || item.status_sj === undefined)
    );
    
    if (itemsSiap.length === 0) {
        containerUtama.innerHTML = '<div class="text-center py-5 no-print">Belum ada barang siap kirim atau semua sudah diproses stok.</div>';
        return;
    }

    // 3. Pecah data menjadi kelompok per 5 item
    const perHalaman = 5;
    const kumpulanHalaman = [];
    for (let i = 0; i < itemsSiap.length; i += perHalaman) {
        kumpulanHalaman.push(itemsSiap.slice(i, i + perHalaman));
    }

    // 4. Bersihkan kontainer
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

        // Baris kosong
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

        // Render struktur HTML
        containerUtama.innerHTML += `
            <div class="halaman-invoice-print" style="${index > 0 ? 'page-break-before: always; margin-top: 20px;' : ''} width: 100%; color: #000; font-family: 'Arial', sans-serif; box-sizing: border-box; padding: 20px;">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center;">
                        <div>
                            
                            <div style="font-size: 11px; line-height: 1.3;">
                                <strong style="font-size: 14px;">MAYUR GROCERIES</strong><br>
                                Mandiri Residence Blok G4 No. 11 Krian - Sidoarjo<br>
                                wiwitdianasari@gmail.com | 0858 4347 4469
                            </div>
                        </div>
                    </div>
                    <h4 style="margin: 0; font-weight: bold; text-decoration: underline; padding: 24px;">INVOICE</h4>
                    <div style="text-align: left;">
                        <div style="font-size: 16px; margin-top: 5px; font-weight: 600; padding: 8px; border: 2px solid #000;">
                            INV. MG: <span id="inv_noSJ">${noSJ}</span>
                        </div>
                        <div id="inv_lokasi_tgl" style="font-weight: bold; font-size: 13px; margin-top: 15px;">${tglTeks}</div>
                        <div style="font-size: 13px; margin-top: 5px;">
                                <strong>Kepada Yth.</strong><br>
                                <span id="inv_cust" style="text-transform: uppercase; font-weight: bold;">${namaCust}</span><br>
                                <div id="inv_alamat" style="line-height: 1.2;">${alamatCust}</div>
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
                    <tbody id="listInvoice">
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold; font-size: 15px;">GRAND TOTAL HALAMAN INI :</td>
                            <td id="inv_grandTotal" style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold; font-size: 15px; background: #f9f9f9;">
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


async function arsipTransaksi() {
    try {
        // 1. Ambil data dasar (Tetap ambil untuk arsip, tapi tidak jadi syarat mati)
        const inputTgl = document.getElementById('sj_tanggal');
        const inputNo = document.getElementById('sj_nomor');
        const previewCust = document.getElementById('p_cust'); 
        const elGrandTotal = document.querySelector('#inv_grandTotal');

        // Jika element tidak ditemukan, beri nilai default agar tidak error 'null'
        const tglInv = inputTgl ? inputTgl.value : new Date().toISOString().split('T')[0];
        const noInvManual = inputNo ? inputNo.value.trim() : "TANPA_NOMOR";
        const namaCust = (previewCust && previewCust.innerText.trim() !== "-") ? previewCust.innerText.trim() : "CUSTOMER UMUM";
        const grandTotalTeks = elGrandTotal ? elGrandTotal.innerText : "0";
        
        // Format Nomor Invoice (Hanya tambah MG jika ada input angka)
        const noInvFinal = (noInvManual !== "" && !noInvManual.startsWith("MG")) ? `MG ${noInvManual}` : noInvManual;

        // 2. VALIDASI MINIMAL (Hanya cek apakah ada barang yang dijual)
        const grandTotal = parseInt(grandTotalTeks.replace(/[^0-9]/g, '')) || 0;
        if (grandTotal === 0) {
             return alert("⚠️ Gagal Simpan: Total belanja Rp 0. Pastikan sudah klik 'Segarkan Data'.");
        }

        if (!confirm(`Arsipkan transaksi ini ke Riwayat Penjualan?`)) return;

        // 3. Kumpulkan daftar barang
        const detailBarang = [];
        const dataAktif = window.databaseBelanjaHarian || databaseBelanja;

        dataAktif.forEach(item => {
            if (item.step3 === true) {
                const qty = parseFloat(item.qtyBersih || item.jumlah || 0);
                const harga = parseFloat(item.harga || 0);
                detailBarang.push({
                    nama: item.nama.toUpperCase(),
                    qty: qty,
                    satuan: item.satuan || 'KG',
                    harga: harga,
                    subtotal: qty * harga
                });
            }
        });

        // 4. Kirim ke Firebase (Riwayat_Penjualan)
        const dataPenjualan = {
            nomor_invoice: noInvFinal,
            tanggal: tglInv,
            customer: namaCust, // Akan berisi "CUSTOMER UMUM" jika input kosong
            items: detailBarang,
            total_omzet: grandTotal,
            waktu_simpan: new Date().toISOString()
        };

        await db.ref('Riwayat_Penjualan').push(dataPenjualan);

        alert("✅ Transaksi Berhasil Diarsipkan!");
        
    } catch (error) {
        console.error("Error Simpan:", error);
        alert("Terjadi kesalahan teknis saat menyimpan.");
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------

//Fungsi EDIT HARGA DI OPERASIONAL
function updateHargaMaster(itemId, hargaPokok, markup) {
    const hp = parseFloat(hargaPokok) || 0;
    const mu = parseFloat(markup) || 0;
    const hargaJual = hp + mu;
    const stokSekarang = Number(dataMaster.stok_tersedia || 0);
    const qtyKeluar = Number(item.qtyBersih || 0);
    const stokBaru = stokSekarang - qtyKeluar;

    if (stokBaru < 0) {
        console.warn(`Peringatan: Stok ${item.nama} akan menjadi negatif (${stokBaru})`);
    }

    db.ref(`master_items/${itemId}`).update({
        harga_pokok: hp,
        markup: mu,
        harga: hargaJual
    }).then(() => {
        console.log("Harga master diperbarui!");
        // Kamu bisa tambah toast/alert kecil di sini
    });
}


async function prosesCetakDanPotongStok() {
    const tglManual = document.getElementById('sj_tanggal')?.value;
    const noSJManual = document.getElementById('sj_nomor')?.value;
    const containerUtama = document.getElementById('area-cetak'); // Area yang berisi surat jalan

    if (!tglManual || !noSJManual) {
        return alert("Mohon isi Tanggal dan Nomor Surat Jalan di header terlebih dahulu!");
    }

    const itemsSiap = (window.databaseBelanjaHarian || []).filter(item => 
        item.step3 === true && 
        item.statusAlur !== "Sudah Dikirim" &&
        (item.status_sj === "pending" || item.status_sj === undefined)
    );

    if (itemsSiap.length === 0) {
        return alert("Tidak ada barang 'SIAP' yang bisa diproses.");
    }

    // --- KUNCI: SIMPAN HTML AREA CETAK SEKARANG ---
    // Kita simpan tampilan yang saat ini ada di layar ke variabel agar tidak hilang saat data diupdate
    const htmlLama = containerUtama.innerHTML;

    try {
        const updates = {};
        const timestamp = Date.now();
        const idPengiriman = "SEND_" + timestamp;
        const d = new Date();
        const waktuSkrg = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

        for (const item of itemsSiap) {
            if (!item.idMaster || item.idMaster === "-") continue;
            const masterPath = `master_items/${item.idMaster}`;
            const snapshot = await db.ref(masterPath).get();

            if (snapshot.exists()) {
                const dataMaster = snapshot.val();
                const stokSekarang = Number(dataMaster.stok_tersedia || 0);
                const qtyKeluar = Number(item.qtyBersih || 0);
                
                updates[`${masterPath}/stok_tersedia`] = stokSekarang - qtyKeluar;
                updates[`belanja/${item.id}/statusAlur`] = "Sudah Dikirim"; 
                updates[`belanja/${item.id}/status_sj`] = "dikirim";
                updates[`belanja/${item.id}/stokSudahDipotong`] = true;
                updates[`belanja/${item.id}/noSJ`] = noSJManual;
                updates[`belanja/${item.id}/tanggalKirimAktual`] = tglManual; 
                updates[`belanja/${item.id}/idPengiriman`] = idPengiriman;

                updates[`history_pengiriman/${idPengiriman}/items/${item.id}`] = {
                    nama: item.nama, qty: qtyKeluar, idMaster: item.idMaster, idBelanja: item.id
                };
            }
        }

        updates[`history_pengiriman/${idPengiriman}/header`] = {
            no_surat_jalan: noSJManual, tanggal_kirim: tglManual, waktu_proses: waktuSkrg, total_item: itemsSiap.length
        };

        // Jalankan Update
        await db.ref().update(updates);
        
        // --- KUNCI: PAKSA HTML TETAP ADA ---
        // Walaupun Firebase sudah mengosongkan data, kita tempel kembali HTML yang sudah kita simpan tadi
        containerUtama.innerHTML = htmlLama;

        alert(`Berhasil! Klik OK untuk mulai mencetak.`);
        
        // Cetak
        window.print();

        // Setelah print selesai, baru bersihkan secara alami
        if (typeof renderPreviewSuratJalan === "function") {
            renderPreviewSuratJalan();
        }

    } catch (error) {
        console.error("Gagal Update Firebase:", error);
        alert("Terjadi kesalahan sistem.");
    }
}


// 1. Fungsi Pilih Semua / Uncheck Semua
function togglePilihSemua(source) {
    const checkboxes = document.querySelectorAll('.check-item');
    checkboxes.forEach(cb => {
        cb.checked = source.checked;
    });
    updateTampilanTombolHapus();
}

// 2. Fungsi untuk memantau centang (panggil ini di renderTabelHarian)
// Tambahkan onchange="updateTampilanTombolHapus()" pada checkbox di dalam renderTabelHarian
function updateTampilanTombolHapus() {
    const terpilih = document.querySelectorAll('.check-item:checked').length;
    const btnHapus = document.getElementById('btnHapusBanyak');
    const badgeCount = document.getElementById('countSelected');

    if (terpilih > 0) {
        btnHapus.classList.remove('d-none');
        badgeCount.classList.remove('d-none');
        badgeCount.innerText = `${terpilih} item terpilih`;
    } else {
        btnHapus.classList.add('d-none');
        badgeCount.classList.add('d-none');
    }
}

// 3. Fungsi Eksekusi Hapus Banyak
async function hapusBanyakItem() {
    const terpilih = document.querySelectorAll('.check-item:checked');
    
    if (terpilih.length === 0) return;

    if (confirm(`Hapus permanen ${terpilih.length} item yang dipilih dari jadwal?`)) {
        try {
            const updates = {};
            terpilih.forEach(cb => {
                const id = cb.value;
                updates[`belanja/${id}`] = null;
            });

            await db.ref().update(updates);
            
            // Reset kontrol setelah hapus
            document.getElementById('selectAll').checked = false;
            updateTampilanTombolHapus();
            
            alert("Item berhasil dihapus!");
        } catch (error) {
            console.error(error);
            alert("Gagal menghapus beberapa item.");
        }
    }
}

// Simpan status halaman histori dalam satu objek agar aman
window.HistoriApp = {
    mode: 'SJ',       // Default: Surat Jalan
    idTerpilih: null  // Menyimpan ID (Key Firebase) yang sedang dibuka
};

function setHistoriMode(mode) {
    console.log("🔄 Mengubah Mode ke:", mode);
    window.HistoriApp.mode = mode;

    // Ambil elemen tombol secara spesifik
    const btnSJ = document.getElementById('btn-mode-sj');
    const btnINV = document.getElementById('btn-mode-inv');

    if (mode === 'SJ') {
        // Nyalakan tombol SJ, matikan INV
        btnSJ.classList.replace('btn-light', 'btn-success');
        btnINV.classList.replace('btn-success', 'btn-light');
    } else {
        // Nyalakan tombol INV, matikan SJ
        btnINV.classList.replace('btn-light', 'btn-success');
        btnSJ.classList.replace('btn-success', 'btn-light');
    }

    // Jika user sudah memilih satu nota, langsung refresh tampilannya
    if (window.HistoriApp.idTerpilih) {
        renderPreviewHistori(window.HistoriApp.idTerpilih);
    }
}

function muatDaftarHistori() {
    const listArea = document.getElementById('listHistori');
    if (!listArea) return;

    // Ambil data dari path: history_pengiriman
    db.ref('history_pengiriman').limitToLast(50).on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            listArea.innerHTML = '<div class="text-center py-5 text-muted small">Belum ada data pengiriman.</div>';
            return;
        }

        let html = '';
        // Balik urutan agar yang terbaru (timestamp besar) ada di atas
        const sortedKeys = Object.keys(data).reverse();

        sortedKeys.forEach(key => {
            const h = data[key].header;
            const items = data[key].items || {};
            const jmlItem = Object.keys(items).length;

            html += `
                <button onclick="renderPreviewHistori('${key}')" 
                        class="list-group-item list-group-item-action border-0 rounded-3 mb-2 shadow-sm py-2 px-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <div class="fw-bold text-success small">${h.no_surat_jalan}</div>
                            <div class="text-dark fw-bold" style="font-size: 0.75rem;">PELANGGAN UMUM</div>
                        </div>
                        <div class="text-end">
                            <div class="badge bg-light text-muted border" style="font-size: 0.6rem;">${h.tanggal_kirim}</div>
                            <div class="text-muted d-block" style="font-size: 0.65rem;">${jmlItem} Barang</div>
                        </div>
                    </div>
                </button>`;
        });
        listArea.innerHTML = html;
    });
}

async function renderPreviewHistori(id) {
    // 1. Simpan ID agar saat ganti mode (SJ/INV) tetap konsisten
    window.HistoriApp.idTerpilih = id; 
    
    const area = document.getElementById('area-preview-histori');
    const titleLabel = document.getElementById('previewTitle');

    if (!area) return;

    // 2. SAPU BERSIH: Pastikan area benar-benar kosong sebelum render baru
    area.innerHTML = ''; 
    
    // Tampilkan loading sebentar di dalam area yang sudah kosong
    const loadingDiv = document.createElement('div');
    loadingDiv.className = "text-center py-5 text-muted small";
    loadingDiv.innerHTML = '<div class="spinner-border spinner-border-sm mb-2"></div><br>Sinkronisasi data...';
    area.appendChild(loadingDiv);

    try {
        const snapshot = await db.ref(`history_pengiriman/${id}`).once('value');
        const fullData = snapshot.val();
        
        if (!fullData) {
            area.innerHTML = '<div class="p-5 text-center">Data tidak ditemukan.</div>';
            return;
        }

        // 3. Update Judul Header
        if (titleLabel) titleLabel.innerText = `DOKUMEN: ${fullData.header.no_surat_jalan}`;

        // 4. BERSIHKAN LAGI: Hapus loading sebelum memasukkan template asli
        area.innerHTML = ''; 

        // 5. Eksekusi Render berdasarkan MODE yang aktif
        if (window.HistoriApp.mode === 'SJ') {
            renderUlangSuratJalan(fullData, area);
        } else {
            renderUlangInvoice(fullData, area);
        }

    } catch (err) {
        console.error("Gagal render:", err);
        area.innerHTML = '<div class="alert alert-danger m-3">Gagal memuat dokumen.</div>';
    }
}

function filterHistori() {
    const keyword = document.getElementById('historiSearch').value.toLowerCase();
    const dateVal = document.getElementById('historiDate').value; // format yyyy-mm-dd
    const buttons = document.querySelectorAll('#listHistori button');

    buttons.forEach(btn => {
        const text = btn.innerText.toLowerCase();
        const matchText = text.includes(keyword);
        const matchDate = !dateVal || text.includes(dateVal);

        if (matchText && matchDate) {
            btn.classList.remove('d-none');
        } else {
            btn.classList.add('d-none');
        }
    });
}

function renderUlangSuratJalan(data, container) {
    const header = data.header || {};
    const itemsRaw = data.items || {};
    const itemsSiap = Object.values(itemsRaw);

    // --- LOGIKA PENOMORAN IDENTIK ---
    let noSJFinal = header.no_surat_jalan || "";
    // Jika formatnya masih timestamp (panjang), kita rapikan
    if (noSJFinal.length > 12) {
        const cleanNumber = noSJFinal.replace('SJ-', '');
        noSJFinal = 'MG-' + cleanNumber.substring(cleanNumber.length - 5);
    } else {
        // Ganti prefix SJ menjadi MG agar seragam dengan layout baru
        noSJFinal = noSJFinal.replace('SJ-', 'MG-').replace('SJ', 'MG');
    }

    // --- LOGIKA TANGGAL ---
    let tglTeks = "-";
    if (header.tanggal_kirim) {
        const d = new Date(header.tanggal_kirim);
        const daftarBulan = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
        tglTeks = `SIDOARJO, ${d.getDate()} ${daftarBulan[d.getMonth()]} ${d.getFullYear()}`;
    }

    // --- LOGIKA PAGING (5 baris per halaman) ---
    const perHalaman = 5;
    const kumpulanHalaman = [];
    for (let i = 0; i < itemsSiap.length; i += perHalaman) {
        kumpulanHalaman.push(itemsSiap.slice(i, i + perHalaman));
    }

    // Reset Container
    container.innerHTML = '';
    
    kumpulanHalaman.forEach((halamanItems, index) => {
        const hlmKe = index + 1;
        const totalHlm = kumpulanHalaman.length;

        let rowsHtml = '';
        halamanItems.forEach((item, idx) => {
            const noUrut = (index * perHalaman) + (idx + 1);
            rowsHtml += `
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${noUrut}</td>
                    <td style="border: 1px solid #000; padding: 8px 12px; text-transform: uppercase;">${item.nama}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">
                        ${item.qty || 0} KG
                    </td>
                </tr>`;
        });

        // Baris kosong penyeimbang (agar tinggi tabel konsisten)
        for (let i = halamanItems.length; i < perHalaman; i++) {
            rowsHtml += `<tr><td style="border: 1px solid #000; padding: 18px;">&nbsp;</td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>`;
        }

        // RENDER LAYOUT IDENTIK
        container.innerHTML += `
            <div class="halaman-surat-jalan-print" style="${index > 0 ? 'page-break-before: always;' : ''} width: 100%; color: #000; font-family: Arial, sans-serif; background: white; padding: 25px; box-sizing: border-box;">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <img src="Logo.png" alt="Logo" style="height: 100px; object-fit: contain; margin-bottom: 5px;">
                        <div style="font-size: 11px; line-height: 1.3;">
                            <strong style="font-size: 14px;">MAYUR GROCERIES</strong><br>
                            Mandiri Residence Blok G4 No. 11 Krian - Sidoarjo<br>
                            wiwitdianasari@gmail.com | 0858 4347 4469
                        </div>
                    </div>

                    <div style="flex: 1; text-align: center; padding-top: 10px;">
                        <h3 style="margin: 0; font-weight: bold; text-decoration: underline; font-size: 20px; letter-spacing: 2px;">SURAT JALAN</h3>
                        <small style="font-size: 11px;">Halaman ${hlmKe} dari ${totalHlm}</small>
                    </div>

                    <div style="flex: 1; display: flex; justify-content: flex-end;">
                        <div style="text-align: left; min-width: 200px;">
                            <div style="font-size: 16px; font-weight: bold; padding: 8px; border: 2.5px solid #000; margin-bottom: 10px; text-align: center;">
                                NO. MG: ${noSJFinal}
                            </div>
                            <div style="font-weight: bold; font-size: 13px;">${tglTeks}</div>
                            <div style="font-size: 13px; margin-top: 5px;">
                                <strong>Kepada Yth.</strong><br>
                                <span style="text-transform: uppercase; font-weight: bold;">PELANGGAN UMUM</span><br>
                                <div style="line-height: 1.2;">SIDOARJO / SURABAYA</div>
                            </div>
                        </div>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 13px; margin-top: 30px;">
                    <thead>
                        <tr style="text-align: center; background-color: #f2f2f2;">
                            <th style="border: 1px solid #000; padding: 10px; width: 50px;">NO</th>
                            <th style="border: 1px solid #000; padding: 10px;">JENIS PESANAN</th>
                            <th style="border: 1px solid #000; padding: 10px; width: 150px;">JUMLAH</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>

                <table style="width: 100%; margin-top: 50px; text-align: center; font-size: 13px; border: none !important;">
                    <tr>
                        <td style="border: none !important; width: 33%;">Dibuat Oleh,<br><br><br><br>( <strong>Firman Agung</strong> )</td>
                        <td style="border: none !important; width: 33%;">Diperiksa Oleh,<br><br><br><br>( <strong>Wiwit Diana Sari</strong> )</td>
                        <td style="border: none !important; width: 33%;">Penerima,<br><br><br><br>( .......................... )</td>
                    </tr>
                </table>
            </div>`;
    });
}


// Jalankan otomatis saat halaman selesai loading
document.addEventListener('DOMContentLoaded', () => {
    // Beri jeda 1 detik agar Firebase siap
    setTimeout(() => {
        if (typeof muatDaftarHistori === "function") {
            console.log("🚀 Memulai muat histori...");
            muatDaftarHistori();
        }
    }, 1000);
});

function renderUlangInvoice(data, container) {
    if (!data) return;

    // --- 1. PENYESUAIAN PENGAMBILAN DATA (Langsung dari root data) ---
    // Karena di Riwayat_Penjualan tidak ada property .header
    let noSJFinal = data.nomor_invoice || "-";
    
    // Logika penomoran (Identik dengan kode Anda)
    if (noSJFinal.length > 12) {
        const cleanNumber = noSJFinal.replace('SJ-', '');
        noSJFinal = 'MG-' + cleanNumber.substring(cleanNumber.length - 5);
    } else {
        noSJFinal = noSJFinal.replace('SJ-', 'MG-').replace('SJ', 'MG');
    }

    // Ambil data sejajar dengan nomor_invoice
    const tglInput = data.tanggal || "";
    const namaCust = data.customer || "PELANGGAN UMUM";
    const alamatCust = data.alamat || "SIDOARJO / SURABAYA";

    // --- 2. LOGIKA TANGGAL ---
    let tglTeks = "-";
    if (tglInput) {
        const d = new Date(tglInput);
        const daftarBulan = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
        tglTeks = `SIDOARJO, ${d.getDate()} ${daftarBulan[d.getMonth()]} ${d.getFullYear()}`;
    }

    // --- 3. AMBIL ITEMS ---
    const itemsRaw = data.items || {};
    const itemsSiap = Object.values(itemsRaw);

    // --- 4. LOGIKA PAGING ---
    const perHalaman = 5;
    const kumpulanHalaman = [];
    for (let i = 0; i < itemsSiap.length; i += perHalaman) {
        kumpulanHalaman.push(itemsSiap.slice(i, i + perHalaman));
    }

    container.innerHTML = '';
    
    kumpulanHalaman.forEach((halamanItems, index) => {
        const hlmKe = index + 1;
        const totalHlm = kumpulanHalaman.length;
        let rowsHtml = '';
        let grandTotalHalaman = 0;

        halamanItems.forEach((item, idx) => {
            const noUrut = (index * perHalaman) + (idx + 1);
            const qty = parseFloat(item.qty || 0);
            const harga = parseFloat(item.harga || 0); // Ambil harga dari Firebase
            const subtotal = item.subtotal || (qty * harga);
            grandTotalHalaman += subtotal;

            rowsHtml += `
                <tr>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${noUrut}</td>
                    <td style="border: 1px solid #000; padding: 8px 12px; text-transform: uppercase;">${item.nama}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: center;">${qty} ${item.satuan || 'KG'}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">Rp ${harga.toLocaleString('id-ID')}</td>
                    <td style="border: 1px solid #000; padding: 8px; text-align: right;">Rp ${subtotal.toLocaleString('id-ID')}</td>
                </tr>`;
        });

        // Baris kosong
        for (let i = halamanItems.length; i < perHalaman; i++) {
            rowsHtml += `<tr><td style="border: 1px solid #000; padding: 18px;">&nbsp;</td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>`;
        }

        // --- 5. RENDER LAYOUT INVOICE (Identik dengan tampilan SJ tapi kolom Invoice) ---
        container.innerHTML += `
            <div class="halaman-invoice-print" style="${index > 0 ? 'page-break-before: always;' : ''} width: 100%; color: #000; font-family: Arial, sans-serif; background: white; padding: 25px; box-sizing: border-box;">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <img src="Logo.png" alt="Logo" style="height: 100px; object-fit: contain; margin-bottom: 5px;">
                        <div style="font-size: 11px; line-height: 1.3;">
                            <strong style="font-size: 14px;">MAYUR GROCERIES</strong><br>
                            Mandiri Residence Blok G4 No. 11 Krian - Sidoarjo<br>
                            wiwitdianasari@gmail.com | 0858 4347 4469
                        </div>
                    </div>

                    <div style="flex: 1; text-align: center; padding-top: 10px;">
                        <h3 style="margin: 0; font-weight: bold; text-decoration: underline; font-size: 20px; letter-spacing: 2px;">INVOICE</h3>
                        <small style="font-size: 11px;">Halaman ${hlmKe} dari ${totalHlm}</small>
                    </div>

                    <div style="flex: 1; display: flex; justify-content: flex-end;">
                        <div style="text-align: left; min-width: 200px;">
                            <div style="font-size: 16px; font-weight: bold; padding: 8px; border: 2.5px solid #000; margin-bottom: 10px; text-align: center;">
                                NO. MG: ${noSJFinal}
                            </div>
                            <div style="font-weight: bold; font-size: 13px;">${tglTeks}</div>
                            <div style="font-size: 13px; margin-top: 5px;">
                                <strong>Kepada Yth.</strong><br>
                                <span style="text-transform: uppercase; font-weight: bold;">${namaCust}</span><br>
                                <div style="line-height: 1.2;">${alamatCust}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 13px; margin-top: 30px;">
                    <thead>
                        <tr style="text-align: center; background-color: #f2f2f2;">
                            <th style="border: 1px solid #000; padding: 10px; width: 50px;">NO</th>
                            <th style="border: 1px solid #000; padding: 10px;">NAMA BARANG</th>
                            <th style="border: 1px solid #000; padding: 10px; width: 100px;">JUMLAH</th>
                            <th style="border: 1px solid #000; padding: 10px; width: 120px;">HARGA</th>
                            <th style="border: 1px solid #000; padding: 10px; width: 120px;">SUBTOTAL</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                    <tfoot>
                        <tr style="font-weight: bold; background: #f9f9f9;">
                            <td colspan="4" style="border: 1px solid #000; padding: 10px; text-align: right;">GRAND TOTAL :</td>
                            <td style="border: 1px solid #000; padding: 10px; text-align: right;">Rp ${grandTotalHalaman.toLocaleString('id-ID')}</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="margin-top: 15px; font-size: 11px;">
                    <strong>Pembayaran via Transfer:</strong> BCA 0123456789 a/n Wiwit Diana Sari
                </div>

                <table style="width: 100%; margin-top: 30px; text-align: center; font-size: 13px; border: none !important;">
                    <tr>
                        <td style="border: none !important; width: 33%;">Dibuat Oleh,<br><br><br><br>( <strong>Firman Agung</strong> )</td>
                        <td style="border: none !important; width: 33%;">Diperiksa Oleh,<br><br><br><br>( <strong>Wiwit Diana Sari</strong> )</td>
                        <td style="border: none !important; width: 33%;">Penerima,<br><br><br><br>( .......................... )</td>
                    </tr>
                </table>
            </div>`;
    });
}

function cetakHistoriSJ() {
    // 1. Ambil konten HTML yang sudah di-render oleh JS kamu
    const kontenSJ = document.getElementById('area-preview-histori').innerHTML;

    // Cek apakah data sudah dipilih
    if (kontenSJ.includes("Pilih data") || kontenSJ.trim() === "") {
        alert("Silakan pilih data histori terlebih dahulu!");
        return;
    }

    // 2. Buka jendela baru (Pop-up)
    const printWindow = window.open('', '_blank', 'width=900,height=600');

    // 3. Masukkan HTML Lengkap ke jendela baru
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak Surat Jalan - Mayur Groceries</title>
            <style>
                /* Reset Dasar */
                body { margin: 0; padding: 0; background: #fff; }
                
                /* Pengaturan Kertas A5 Landscape */
                @page { 
                    size: A5 landscape; 
                    margin: 0; 
                }

                /* CSS Tambahan agar tampilan sama persis dengan render kamu */
                .halaman-surat-jalan-print {
                    width: 100%;
                    height: 100%;
                    padding: 20px;
                    box-sizing: border-box;
                    page-break-after: always;
                }

                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000 !important; }
                
                /* Pastikan tabel tanda tangan tidak punya border */
                table[style*="border: none"] td, 
                table[style*="border: none !important"] td {
                    border: none !important;
                }

                /* Paksa Gambar Muncul */
                img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            </style>
        </head>
        <body>
            ${kontenSJ}
            <script>
                // Tunggu konten (termasuk gambar logo) selesai dimuat
                window.onload = function() {
                    window.print();
                    // Menutup jendela otomatis setelah print selesai atau dibatalkan
                    window.onafterprint = function() {
                        window.close();
                    };
                };
            <\/script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

async function shareGambar(idElemen, judulFile) {
    const elemen = document.getElementById(idElemen);
    if (!elemen) return alert("Elemen tidak ditemukan!");

    try {
        // 1. Ambil "Foto" dari elemen HTML
        const canvas = await html2canvas(elemen, {
            scale: 2, // Biar gambar tajam/HD
            useCORS: true, // Biar logo muncul
            backgroundColor: "#ffffff"
        });

        // 2. Ubah jadi Blob (Data Gambar)
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `${judulFile}.png`, { type: 'image/png' });

            // 3. Cek apakah Browser mendukung fitur Share (Biasanya di HP)
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: judulFile,
                    text: `Berikut adalah ${judulFile} dari Mayur Groceries.`
                });
            } else {
                // 4. Jika di Laptop/PC (Tidak bisa share langsung), maka otomatis Download
                const link = document.createElement('a');
                link.download = `${judulFile}.png`;
                link.href = URL.createObjectURL(blob);
                link.click();
                alert("Gambar telah diunduh. Silakan lampirkan manual ke WhatsApp.");
            }
        }, 'image/png');
    } catch (err) {
        console.error("Gagal share gambar:", err);
        alert("Terjadi kesalahan saat memproses gambar.");
    }
}


async function ambilScreenshotSJ() {
    const areaCetak = document.getElementById('area-cetak');
    if (!areaCetak) return alert("Area Surat Jalan tidak ditemukan!");

    // Tampilkan loading sederhana (opsional)
    const tombolAsal = event.target;
    const teksAsal = tombolAsal.innerHTML;
    tombolAsal.innerHTML = "📸 Memproses...";
    tombolAsal.disabled = true;

    try {
        // Ambil screenshot menggunakan html2canvas
        const canvas = await html2canvas(areaCetak, {
            scale: 3, // Skala tinggi agar gambar sangat tajam (High Definition)
            useCORS: true, // Pastikan logo muncul
            backgroundColor: "#ffffff", // Latar belakang putih bersih
            // Mengabaikan elemen dengan class 'no-print' agar tidak ikut terfoto
            ignoreElements: (node) => {
                return node.classList.contains('no-print');
            }
        });

        // Ubah hasil capture menjadi data gambar
        const imgData = canvas.toDataURL("image/png");

        // Proses Download atau Share
        const link = document.createElement('a');
        const tgl = new Date().toISOString().slice(0, 10);
        link.download = `SJ_Mayur_${tgl}.png`;
        link.href = imgData;
        link.click();

        alert("Screenshot Surat Jalan berhasil diunduh!");
    } catch (err) {
        console.error("Gagal mengambil screenshot:", err);
        alert("Gagal mengambil gambar. Pastikan library html2canvas sudah terpasang.");
    } finally {
        // Kembalikan tombol ke status semula
        tombolAsal.innerHTML = teksAsal;
        tombolAsal.disabled = false;
    }
}


// Variabel global untuk menampung link
let urlAksesKaryawan = "";

// 1. Fungsi Utama untuk Membuka Modal
function shareKaryawanLink() {
    // Membuat URL otomatis: namafile.html?view=karyawan
    urlAksesKaryawan = window.location.origin + window.location.pathname + "?view=karyawan";
    
    const inputEl = document.getElementById('inputLinkKaryawan');
    const modalEl = document.getElementById('modalShareKaryawan');

    if (inputEl && modalEl) {
        inputEl.value = urlAksesKaryawan;
        
        // Inisialisasi dan Tampilkan Modal
        const myModal = new bootstrap.Modal(modalEl);
        myModal.show();
    } else {
        console.error("Elemen modal atau input tidak ditemukan!");
    }
}

// 2. Fungsi Copy Link ke Clipboard
function copyLinkKaryawan(btn) {
    const input = document.getElementById('inputLinkKaryawan');
    
    // Gunakan Clipboard API modern
    navigator.clipboard.writeText(input.value).then(() => {
        // Feedback visual sederhana
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Siap!';
        btn.classList.replace('btn-primary', 'btn-dark');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.replace('btn-dark', 'btn-primary');
        }, 2000);
    }).catch(err => {
        console.error("Gagal menyalin: ", err);
    });
}

// 3. Fungsi Kirim WhatsApp
function shareKeWA() {
    const pesan = encodeURIComponent("Halo Tim, berikut link rundown pekerjaan Mayur Groceries hari ini: " + urlAksesKaryawan);
    window.open(`https://wa.me/?text=${pesan}`, '_blank');
}

// Variabel untuk menampung link customer secara global
let linkLiveTracking = "";

// 1. Fungsi untuk Membuka Modal
function bukaShareCustomer() {
    // Membuat URL lengkap
    const lokasiHalaman = window.location.origin + window.location.pathname;
    
    // Pastikan menggunakan parameter ?view=customer
    linkLiveTracking = lokasiHalaman + "?view=customer";
    
    const inputEl = document.getElementById('inputLinkCustomer');
    if (inputEl) {
        inputEl.value = linkLiveTracking;
    }

    // Munculkan Modal (Gunakan cara Bootstrap 5 yang benar)
    const modalEl = document.getElementById('modalShareCustomer');
    if (modalEl) {
        const myModal = new bootstrap.Modal(modalEl);
        myModal.show();
    }
}

// 2. Fungsi Salin Link (Feedback Visual)
function copyLinkCustomer(btn) {
    const input = document.getElementById('inputLinkCustomer');
    navigator.clipboard.writeText(input.value).then(() => {
        const iconAsal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        btn.classList.replace('btn-success', 'btn-dark');
        
        setTimeout(() => {
            btn.innerHTML = iconAsal;
            btn.classList.replace('btn-dark', 'btn-success');
        }, 2000);
    });
}

// 3. Fungsi Kirim WhatsApp
function kirimWACustomer() {
    // Ambil nama pelanggan dari elemen p_cust (jika ada di preview nota)
    const namaPelanggan = document.getElementById('p_cust')?.innerText || "Pelanggan";
    
    const pesan = encodeURIComponent(
        `Halo Kak ${namaPelanggan}, pesanan Mayur Groceries Anda sedang kami proses. \n\n` +
        `Pantau status pesanan dan live tracking pengiriman di sini: \n` +
        linkLiveTracking
    );
    
    window.open(`https://wa.me/?text=${pesan}`, '_blank');
}


function proteksiHalamanCustomer() {
    // 1. Sembunyikan Navigasi Atas (Pills)
    const navTab = document.getElementById('pills-tab');
    if (navTab) navTab.style.setProperty('display', 'none', 'important');

    // 2. Sembunyikan Header Admin (Opsional, agar bersih)
    const headerAdmin = document.querySelector('.header-container');
    if (headerAdmin) headerAdmin.style.display = 'none';

    // 3. Paksa tampilkan Tab Customer
    const customerTabEl = document.querySelector('#tab-view-customer');
    if (customerTabEl) {
        // Hilangkan class active dari tab lain
        document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('show', 'active'));
        // Aktifkan tab customer
        customerTabEl.classList.add('show', 'active');
    }
}


function inisialisasiModeTampilan() {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');

    if (view === 'customer') {
        console.log("Mode Customer Terdeteksi!");

        // 1. Sembunyikan Overlay Login (PENTING: Agar customer tidak diminta PIN)
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) loginOverlay.style.display = 'none';

        // 2. Sembunyikan Navigasi Tab Admin (pills-tab)
        const navAdmin = document.getElementById('pills-tab');
        if (navAdmin) navAdmin.style.setProperty('display', 'none', 'important');

        // 3. Sembunyikan Header (Judul Mayur Groceries & Tombol Keluar)
        // Kita cari container header di bagian paling atas
        const headerUtama = document.querySelector('.container-fluid > .d-flex');
        if (headerUtama) headerUtama.style.setProperty('display', 'none', 'important');

        // 4. Paksa Aktifkan Tab View Customer
        // Hapus class 'active' dari semua tab-pane
        document.querySelectorAll('.tab-pane').forEach(tab => {
            tab.classList.remove('show', 'active');
        });

        // Aktifkan hanya tab customer
        const tabCustomer = document.getElementById('tab-view-customer');
        if (tabCustomer) {
            tabCustomer.classList.add('show', 'active');
        } else {
            console.error("Tab 'tab-view-customer' tidak ditemukan di HTML!");
        }
    }
}