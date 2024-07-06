const json = require("body-parser/lib/types/json");
const express = require("express");
const router = express.Router();
const mysql = require("mysql");
const md5 = require("md5");

const db = mysql.createConnection({
  host: "localhost",
  database: "db_akuntansi",
  user: "root",
  password: "",
});

// FORM LOGIN
router.get("/", (req, res) => {
  res.render("index");
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send(`<script>alert('username dan password harus ada');</script>`);
  }
  const hashedPassword = md5(password);
  const sql_login = "SELECT * FROM user WHERE username = ? AND password = ?";
  db.query(sql_login, [username, hashedPassword], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err });
    }
    if (result.length === 0) {
      return res.status(401).json({ message: "tidak ada username ini" });
    }
    if (result.length > 0) {
      res.send(`<script> window.location.href = '/tablecoa';</script>`);
    }
  });
});

router.post("/createadmin", (req, res) => {
  const { username, password, nama } = req.body;
  const hashedPassword2 = md5(password);
  const sql_create = `INSERT INTO user (id, nama_admin, username, password) values ("", ? , ? ,? )`;
  db.query(sql_create, [nama, username, hashedPassword2], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Terjadi kesalahan saat menambahkan akun baru");
      return;
    }
    res.send(`<script>alert('Berhasil menambahkan Akun baru.'); window.location.href = '/';</script>`);
  });
});

// Route for table coa
router.get("/tablecoa", (req, res) => {
  const sql = "SELECT * FROM table_coa";
  db.query(sql, (err, result) => {
    const users = JSON.parse(JSON.stringify(result));
    users.forEach((user) => {
      user.saldo = formatRupiah(user.saldo);
    });
    res.render("tablecoa", { users: users, title: "Daftar Akun" });
  });
});

router.post("/editAccount", (req, res) => {
  const { oldAccountName, newAccountName, saldoAkunLama, saldoAkunBaru } = req.body;
  // mengubah format nilai saldo
  const nilaiAkhir = parseRupiah(saldoAkunBaru);
  const query_edit = `UPDATE table_coa SET nama_akun = ?, saldo = ? WHERE nama_akun = ?`;
  db.query(query_edit, [newAccountName, nilaiAkhir, oldAccountName], (error) => {
    if (error) {
      return res.status(500).send(error);
    }

    res.send(`<script>alert('Data berhasil diubah.'); window.location.href = '/';</script>`);
  });
});

router.post("/deleteAccount", (req, res) => {
  const { account } = req.body;
  const query = `DELETE FROM table_coa WHERE nama_akun = ?`;
  db.query(query, [account], (error, results) => {
    if (error) {
      return res.status(500).send(error);
    }

    res.redirect("/");
  });
});

router.post("/tambahAkun", (req, res) => {
  const { kode_akun_tambah, nama_akun_tambah, jenis_tambah } = req.body;
  const tambah_coa = `INSERT INTO table_coa (kode_akun, nama_akun, jenis, saldo) VALUES (?, ?, ?, 0)`;

  // Gunakan variabel lain selain 'res' untuk callback db.query
  db.query(tambah_coa, [kode_akun_tambah, nama_akun_tambah, jenis_tambah], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Terjadi kesalahan saat menambahkan akun baru");
      return;
    }
    res.send(`<script>alert('Berhasil menambahkan Akun baru.'); window.location.href = '/tablecoa';</script>`);
  });
});

// -----------------------------------

//page data Transaksi

router.get("/datatransaksi", (req, res) => {
  const datatransaksi = "SELECT * FROM table_transaksi";
  db.query(datatransaksi, (err, result) => {
    const datas = JSON.parse(JSON.stringify(result));
    datas.forEach((data) => {
      if (data.tanggal) {
        const utcDate = new Date(data.tanggal);
        data.tanggal = utcDate.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
      }

      data.nominal = formatRupiah(data.nominal);
    });

    res.render("datatransaksi", { datas: datas, title: "Data Transaksi" });
  });
});

// Route for input

router.get("/input", (req, res) => {
  const option_debit = "SELECT nama_akun, kode_akun FROM table_coa";
  db.query(option_debit, (err, result) => {
    const debitCoa = JSON.parse(JSON.stringify(result));
    res.render("input", { debitCoa: debitCoa });
  });
});

router.post("/input", (req, res) => {
  const { no, tanggal, nama_transaksi, akun_debit, akun_kredit, nominal } = req.body;

  const nominalF = parseRupiah(nominal);

  /* Input data ke table transaksi */
  const query_transaksi = `INSERT INTO table_transaksi (no, tanggal, nama_transaksi, akun_debit, akun_kredit, nominal) VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(query_transaksi, [no, tanggal, nama_transaksi, akun_debit, akun_kredit, nominalF], (err) => {
    if (err) {
      res.send(`<script>alert('Error: ${err.message}');</script>`);
      return;
    }
  });

  /* ------------- */

  /* Update table COA */
  const queryDebit = `SELECT jenis FROM table_coa WHERE nama_akun = ?`;
  db.query(queryDebit, [akun_debit], (err, resultDebit) => {
    if (err) {
      res.send(`<script>alert('Error: ${err.message}');</script>`);
      return;
    }
    const jenisDebit = resultDebit[0].jenis;
    const queryKredit = `SELECT jenis FROM table_coa WHERE nama_akun = ?`;
    db.query(queryKredit, [akun_kredit], (err, resultKredit) => {
      if (err) {
        res.send(`<script>alert('Error: ${err.message}');</script>`);
        return;
      }
      const jenisKredit = resultKredit[0].jenis;
      let queryUpdateDebit;
      if (jenisDebit === "Aktiva") {
        queryUpdateDebit = `UPDATE table_coa SET saldo = saldo + ? WHERE nama_akun = ?`;
      } else if (jenisDebit === "Passiva") {
        queryUpdateDebit = `UPDATE table_coa SET saldo = saldo - ? WHERE nama_akun = ?`;
      }
      db.query(queryUpdateDebit, [nominalF, akun_debit], (err) => {
        if (err) {
          res.send(`<script>alert('Error: ${err.message}');</script>`);
          return;
        }
      });
      let queryUpdateKredit;
      if (jenisKredit === "Aktiva") {
        queryUpdateKredit = `UPDATE table_coa SET saldo = saldo - ? WHERE nama_akun = ?`;
      } else if (jenisKredit === "Passiva") {
        queryUpdateKredit = `UPDATE table_coa SET saldo = saldo + ? WHERE nama_akun = ?`;
      }
      db.query(queryUpdateKredit, [nominalF, akun_kredit], (err, results) => {
        if (err) {
          res.send(`<script>alert('Error: ${err.message}');</script>`);
        } else {
          res.send(`<script>alert('Data berhasil disimpan.'); window.location.href = '/input';</script>`);
        }
      });
    });
  });

  // ---------------------- //
});

/* Neraca Saldo */

router.get("/neracasaldo", (req, res) => {
  const queryneraca = "SELECT jenis, SUM(saldo) as total_saldo from table_coa group by jenis";
  db.query(queryneraca, (err, results) => {
    if (err) {
      res.send(`<script>alert('Error: ${err.message}');</script>`);
    } else {
      const Aktiva = results.find((row) => row.jenis === "Aktiva");
      const Passiva = results.find((row) => row.jenis === "Passiva");

      const totalSaldoAktiva = Aktiva ? Aktiva.total_saldo : 0;
      const totalSaldoPassiva = Passiva ? Passiva.total_saldo : 0;

      const AktivaAkhir = formatRupiah(totalSaldoAktiva);
      const PassivaAkhir = formatRupiah(totalSaldoPassiva);

      const ambilData = `SELECT nama_akun, jenis, saldo from table_coa WHERE jenis = 'aktiva' AND saldo != 0`;

      db.query(ambilData, (req, results) => {
        const ambil = JSON.parse(JSON.stringify(results));
        ambil.forEach((ambil) => {
          if (ambil.saldo) {
            ambil.saldo = formatRupiah(ambil.saldo);
          }
        });
        const ambilData2 = `SELECT nama_akun, jenis, saldo from table_coa WHERE jenis = 'Passiva' AND saldo != 0`;
        db.query(ambilData2, (req, results) => {
          const ambil2 = JSON.parse(JSON.stringify(results));
          ambil2.forEach((ambil2) => {
            if (ambil2.saldo) {
              ambil2.saldo = formatRupiah(ambil2.saldo);
            }
          });
          res.render("neracasaldo", {
            AktivaAkhir,
            PassivaAkhir,
            ambil: ambil,
            ambil2: ambil2,
          });
        });
      });
    }
  });
});

/* labarugi */
router.get("/labarugi", (req, res) => {
  const pendapatanAkun = [`pendapatan`, `pendapatan lainnya`];
  const bebanAkun = [`beban gaji karyawan`, `beban administrasi`, `beban listrik-air-telepon`, `beban sewa kantor`, `beban asuransi`, `beban keamanan`];

  const pendapatanQuery = `SELECT SUM(saldo) AS total FROM table_coa WHERE nama_akun IN (?)`;
  const bebanQuery = `SELECT SUM(saldo) AS total FROM table_coa WHERE nama_akun IN (?)`;

  db.query(pendapatanQuery, [pendapatanAkun], (err, pendapatanResults) => {
    if (err) {
      console.error("Error executing pendapatanQuery:", err);
      return res.send(`<script>alert('Error: ${err.message}');</script>`);
    }

    db.query(bebanQuery, [bebanAkun], (err, bebanResults) => {
      if (err) {
        console.error("Error executing bebanQuery:", err);
        return res.send(`<script>alert('Error: ${err.message}');</script>`);
      }

      const totalPendapatan = formatRupiah(pendapatanResults[0].total || 0);
      const totalBeban = formatRupiah(bebanResults[0].total || 0);
      const totalPendapatanJ = pendapatanResults[0].total || 0;
      const totalBebanJ = bebanResults[0].total || 0;
      const labaRugi = formatRupiah(totalPendapatanJ - totalBebanJ);

      // Render EJS template dan passing data
      res.render("labarugi", {
        totalPendapatan,
        totalBeban,
        labaRugi,
      });
    });
  });
});

/* Buku besar */

router.get("/bukuBesar", (req, res) => {
  const query_testing = "SELECT nama_akun as akun FROM table_coa";
  db.query(query_testing, (error, results) => {
    if (error) {
      return res.status(500).send(error);
    }

    const accounts = results.map((row) => row.akun);
    res.render("bukuBesar", { accounts, ledger: [], selectedAccount: null });
  });
});

router.get("/caribukubesar", (req, res) => {
  const { selectedAccount } = req.query;
  if (!selectedAccount) {
    return res.redirect("/bukuBesar");
  }
  const query_1 = `SELECT tanggal, nama_transaksi, CASE WHEN akun_debit = ? THEN nominal ELSE 0 END AS debit, CASE WHEN akun_kredit = ? THEN nominal ELSE 0 END AS kredit FROM table_transaksi WHERE akun_debit = ? OR akun_kredit = ?`;
  db.query(query_1, [selectedAccount, selectedAccount, selectedAccount, selectedAccount], (error, result) => {
    if (error) {
      return res.status(500).send(error);
    }
    let saldo = 0;
    const ledger = result.map((row) => {
      saldo += row.debit - row.kredit;
      const saldoPositif = Math.abs(saldo);
      return {
        tanggal: row.tanggal,
        nama_transaksi: row.nama_transaksi,
        debit: row.debit,
        kredit: row.kredit,
        saldo: saldoPositif,
      };
    });
    ledger.forEach((ledgers) => {
      if (ledgers.tanggal) {
        const utcDate = new Date(ledgers.tanggal);
        ledgers.tanggal = utcDate.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
      }
      ledgers.debit = formatRupiah(ledgers.debit);
      ledgers.kredit = formatRupiah(ledgers.kredit);
      ledgers.saldo = formatRupiah(ledgers.saldo);
    });
    const query_2 = "SELECT nama_akun as akun FROM table_coa";
    db.query(query_2, (error, results) => {
      if (error) {
        return res.status(500).send(error);
      }
      const accounts = results.map((row) => row.akun);
      res.render("bukuBesar", { accounts, ledger, selectedAccount });
    });
  });
});

//function format Rupiah

// Mengubah data jadi rupiah
function formatRupiah(angka) {
  var number_string = angka.toString(),
    sisa = number_string.length % 3,
    rupiah = number_string.substr(0, sisa),
    ribuan = number_string.substr(sisa).match(/\d{3}/g);

  if (ribuan) {
    separator = sisa ? "." : "";
    rupiah += separator + ribuan.join(".");
  }
  return "Rp " + rupiah;
}

// mengubah rupiah menjadi format data
function parseRupiah(input) {
  if (!input || typeof input !== "string") {
    return 0; // Mengembalikan nilai default jika input tidak valid
  }

  // Mengambil nilai tanpa simbol mata uang dan pemisah ribuan
  let nilai = input.replace(/[^\d]/g, "");

  // Mengembalikan nilai sebagai angka numerik
  if (nilai !== "") {
    return parseInt(nilai, 10);
  } else {
    return 0; // Mengembalikan 0 jika input kosong atau tidak valid
  }
}

module.exports = router;
