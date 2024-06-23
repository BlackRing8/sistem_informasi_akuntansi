const express = require("express");
const mysql = require("mysql");
const BodyParser = require("body-parser");
const path = require("path");
const indexRouter = require("./routes/index");

const app = express();

app.use(
  BodyParser.urlencoded({
    extended: true,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Use the index router
app.use("/", indexRouter);

app.listen(8000, () => {
  console.log("server ready at http://localhost:8000");
});

// data bases

const db = mysql.createConnection({
  host: "localhost",
  database: "db_akuntansi",
  user: "root",
  password: "",
});

db.connect((err) => {
  console.log("terkoneksi ke database....");
});
