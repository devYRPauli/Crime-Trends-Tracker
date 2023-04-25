const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require("express-session");
const http = require("http");
const path = require("path");
const oracledb = require("oracledb");
const app = express();

app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

console.log(__dirname + "\\public");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());
app.use(express.static("public"));
// app.use(cookieParser());

app.use(
  session({
    secret: "This is the little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

const connectDB = async (Query) => {
  try {
    const connection = await oracledb.getConnection({
      user: "bmishra1",
      password: "pIruNRcMxV58dD2mUH57kiio",
      connectionString: "oracle.cise.ufl.edu/orcl",
    });
    const result = await connection.execute(Query);
    return result;
  } catch (error) {
    console.log("39 = ", error);
  }
};

// connectDB("SELECT * FROM student").then((res) => console.log(res));

app
  .route("/")
  .get(async (req, res) => {
    res.render("index", { result: "" });
  })
  .post(async (req, res) => {
    console.log("hello");
    connectDB("SELECT * FROM AGENCY").then((result) => {
      console.log(result);
      res.render("index", { result: result.rows[0][0] });
    });
  });

app
  .route("/SpatialAnalysis")
  .get(async (req, res) => {
    res.render("Spatial_Analysis", { result: 0 });
  })
  .post(async (req, res) => {
    const { location, time, date } = req.body;
    const year = new Date(date).getFullYear();
    var day = "day";
    if (Number(time.slice(0, 2)) >= 12) {
      day = "night";
    }
    connectDB(
      // `SELECT * FROM LOCATION=${location} WHERE YEAR=${year} and TIME=${day}`
      "SELECT * FROM STUDENT"
    ).then((result) => {
      console.log(result);
      res.render("Spatial_Analysis", { result: result });
    });
  });

app
  .route("/TrendAnalysis")
  .get(async (req, res) => {
    res.render("Trend_Analysis", { result: 0 });
  })
  .post(async (req, res) => {
    const { agency1, agency2, crimeType, year } = req.body;
    connectDB(
      // `SELECT * FROM LOCATION=${location} WHERE YEAR=${year} and TIME=${day}`
      "SELECT * FROM STUDENT"
    ).then((result) => {
      console.log(result);
      res.render("Trend_Analysis", { result: result });
    });
  });

app
  .route("/OffenceAnalysis")
  .get(async (req, res) => {
    res.render("Offence_Analysis", { result: 0 });
  })
  .post(async (req, res) => {
    const { location, time, date } = req.body;
    const year = new Date(date).getFullYear();
    var day = "day";
    if (Number(time.slice(0, 2)) >= 12) {
      day = "night";
    }
    connectDB(
      // `SELECT * FROM LOCATION=${location} WHERE YEAR=${year} and TIME=${day}`
      "SELECT * FROM STUDENT"
    ).then((result) => {
      console.log(result);
      res.render("Offence_Analysis", { result: result });
    });
  });

app
  .route("/Ranking")
  .get(async (req, res) => {
    res.render("Ranking", { result: 0 });
  })
  .post(async (req, res) => {
    const {
      state,
      agencies,
      weapons,
      victim,
      offender,
      crimeType,
      age,
      sex,
      race,
    } = req.body;
    connectDB(
      // `SELECT * FROM LOCATION=${location} WHERE YEAR=${year} and TIME=${day}`
      "SELECT * FROM STUDENT"
    ).then((result) => {
      console.log(result);
      res.render("Ranking", { result: result });
    });
  });

app
  .route("/Correlation")
  .get(async (req, res) => {
    res.render("Correlation", { result: 0 });
  })
  .post(async (req, res) => {
    const { age, time, state, lineChart, barChart, pieChart } = req.body;
    connectDB(
      // `SELECT * FROM LOCATION=${location} WHERE YEAR=${year} and TIME=${day}`
      "SELECT * FROM STUDENT"
    ).then((result) => {
      console.log(result);
      res.render("Correlation", { result: result });
    });
  });

let port = 5000;

app.listen(port, function () {
  console.log("Server has started successfully.");
});
