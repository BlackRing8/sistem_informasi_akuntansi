const json = require("body-parser/lib/types/json");
const express = require("express");
const router = express.Router();
const mysql = require("mysql");

const db = mysql.createConnection({
  host: "localhost",
  database: "db_akuntansi",
  user: "root",
  password: "",
});

// Route for Home page
router.get("/", (req, res) => {
  const sql = "SELECT * FROM table_coa";
  db.query(sql, (err, result) => {
    const users = JSON.parse(JSON.stringify(result));
    res.render("index", { users: users, title: "Daftar Akun" });
  });
});

// Transaksi data
router.get("/datatransaksi", (req, res) => {
  const datatransaksi = "SELECT * FROM table_transaksi";
  db.query(datatransaksi, (err, result) => {
    const datas = JSON.parse(JSON.stringify(result));
    datas.forEach((data) => {
      if (data.tanggal) {
        const utcDate = new Date(data.tanggal);
        data.tanggal = utcDate.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
      }
    });

    res.render("datatransaksi", { datas: datas, title: "Data Transaksi" });
  });
});

// Route for About page
router.get("/input", (req, res) => {
  const option_debit = "SELECT nama_akun, kode_akun FROM table_coa";
  db.query(option_debit, (err, result) => {
    const debitCoa = JSON.parse(JSON.stringify(result));
    res.render("input", { debitCoa: debitCoa });
  });
});

router.post("/caribukubesar", (req, res) => {
  const { bukuBesar } = req.body;
  const caribb = `SELECT * from ??`;
  db.query(caribb, [bukuBesar], (err, result) => {
    if (err) {
      res.status(400).send(`<script> window.location.href = '/bukuBesar';alert('tidak ada buku besar dengan nama tersebut');</script>`);
    } else {
      const bbuku = JSON.parse(JSON.stringify(result));
      bbuku.forEach((bbuku) => {
        if (bbuku.tanggal) {
          const utcDate = new Date(bbuku.tanggal);
          bbuku.tanggal = utcDate.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
        }
      });
      res.render("caribukubesar", { bbuku: bbuku });
    }
  });
});

router.get("/bukuBesar", (req, res) => {
  const bukubb = `SELECT nama_akun from table_coa`;
  db.query(bukubb, (err, results) => {
    const listbb = JSON.parse(JSON.stringify(results));
    res.render("bukuBesar", { listbb: listbb });
  });
});

router.post("/input", (req, res) => {
  const { no, tanggal, nama_transaksi, akun_debit, akun_kredit, nominal } = req.body;

  /* Input data ke table transaksi */
  const query_transaksi = `INSERT INTO table_transaksi (no, tanggal, nama_transaksi, akun_debit, akun_kredit, nominal) VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(query_transaksi, [no, tanggal, nama_transaksi, akun_debit, akun_kredit, nominal], (err) => {
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
      db.query(queryUpdateDebit, [nominal, akun_debit], (err) => {
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
      db.query(queryUpdateKredit, [nominal, akun_kredit], (err) => {
        if (err) {
          res.send(`<script>alert('Error: ${err.message}');</script>`);
        }
      });
    });
  });

  // ---------------------- //

  // input ke table buku besar masing-masing

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
      const getlastSaldoDebit = `SELECT saldo FROM ?? ORDER BY no DESC LIMIT 1`;
      db.query(getlastSaldoDebit, [akun_debit], (err, results) => {
        let lastSaldoDebit = results.length > 0 ? results[0].saldo : 0;
        const getlastSaldoKredit = `SELECT saldo FROM ?? ORDER BY no DESC LIMIT 1`;
        db.query(getlastSaldoKredit, [akun_kredit], (err, results) => {
          let lastSaldoKredit = results.length > 0 ? results[0].saldo : 0;
          let newSaldo;
          if (jenisDebit === "Aktiva") {
            newSaldo = parseInt(lastSaldoDebit, 10) + parseInt(nominal, 10);
          } else if (jenisDebit === "Passiva") {
            newSaldo = parseInt(lastSaldoDebit, 10) - parseInt(nominal, 10);
          }
          const query_akun_debit = `INSERT INTO ?? (no, tanggal, keterangan, debit, kredit, saldo) VALUES ('',?, ?, ?,'', ?) `;
          db.query(query_akun_debit, [akun_debit, tanggal, nama_transaksi, nominal, newSaldo], (err) => {
            if (err) {
              res.send(`<script>alert('Error: ${err.message}');</script>`);
            }
          });
          let newSaldo2;
          if (jenisKredit === "Aktiva") {
            newSaldo2 = parseInt(lastSaldoKredit, 10) - parseInt(nominal, 10);
          } else if (jenisKredit === "Passiva") {
            newSaldo2 = parseInt(lastSaldoKredit, 10) + parseInt(nominal, 10);
          }
          const query_akun_kredit = `INSERT INTO ?? (no, tanggal, keterangan, debit, kredit, saldo) VALUES ('',?, ?, '',?, ?) `;
          db.query(query_akun_kredit, [akun_kredit, tanggal, nama_transaksi, nominal, newSaldo2], (err) => {
            if (err) {
              res.send(`<script>alert('Error: ${err.message}');</script>`);
            } else {
              res.send(`<script>alert('Data berhasil disimpan.'); window.location.href = '/input';</script>`);
            }
          });
        });
      });
    });
  });

  // ----------------------- //
});

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

      res.render("neracasaldo", {
        totalSaldoAktiva,
        totalSaldoPassiva,
      });
    }
  });
});

router.get("/labarugi", (req, res) => {
  res.render("labarugi");
});

module.exports = router;
