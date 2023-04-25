const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require("express-session");
const http = require("http");
const fs = require("fs");
const oracledb = require("oracledb");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

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

oracledb.initOracleClient({
  libDir:
    "D:\\Downloads\\instantclient-basic-windows.x64-21.9.0.0.0dbru\\instantclient_21_9",
});

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

const width = 1000; // define width and height of canvas
const height = 1000;
const chartCallback = (ChartJS) => {
  console.log("chart built");
};
const nodeChartCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

var xLabels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

app
  .route("/")
  .get(async (req, res) => {
    res.render("index", { result: "" });
  })
  .post(async (req, res) => {
    console.log("hello");
    connectDB(`
    SELECT SUM(num_tuples) FROM (SELECT COUNT(*) as num_tuples FROM AGENCY UNION SELECT COUNT(*) as num_tuples FROM ARRESTEE UNION SELECT COUNT(*) as num_tuples FROM INCIDENT UNION SELECT COUNT(*) as num_tuples FROM OFFENDEDBY UNION SELECT COUNT(*) as num_tuples FROM OFFENDER UNION SELECT COUNT(*) as num_tuples FROM OFFENSE UNION SELECT COUNT(*) as num_tuples FROM TARGETOF UNION SELECT COUNT(*) as num_tuples FROM VICTIM UNION SELECT COUNT(*) as num_tuples FROM VICTIMINJURYTYPE)
    `).then((result) => {
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
      `
      SELECT location_type, SUM(num_incidents) as num_incidents FROM
(SELECT * FROM
    (SELECT location_type, COUNT(*) as num_incidents
    FROM (
        SELECT agency_id, state
        FROM agency
        WHERE state='TX'
        ) agency
        INNER JOIN 
        (SELECT *
        FROM incident
        WHERE hour_of<12 AND EXTRACT(MONTH FROM date_of)=3) incident
        ON agency.agency_id = incident.agency_id
        INNER JOIN 
        offense
        ON incident.incident_id = offense.incident_id
    GROUP BY location_type
    ORDER BY num_incidents DESC
    FETCH FIRST 3 ROWS ONLY)
UNION
SELECT 'Other/Unknown' as location_type, SUM(num_incidents) as num_incidents
FROM(
    SELECT location_type, COUNT(*) as num_incidents
    FROM (
        SELECT agency_id, state
        FROM agency
        WHERE state='TX'
        ) agency
        INNER JOIN 
        (SELECT *
        FROM incident
        WHERE hour_of<12 AND EXTRACT(MONTH FROM date_of)=3) incident
        ON agency.agency_id = incident.agency_id
        INNER JOIN 
        offense
        ON incident.incident_id = offense.incident_id
    GROUP BY location_type
    ORDER BY num_incidents DESC
    OFFSET 3 ROWS))
GROUP BY location_type
ORDER BY num_incidents DESC
      `
    ).then(async (result) => {
      console.log(result);

      const data = [];
      const labels = [];

      result.rows.forEach((element, index) => {
        data.push(element[1]);
      });

      result.rows.forEach((element, index) => {
        // console.log(element[0]);
        labels.push(element[0]);
      });

      res.render("Spatial_Analysis", {
        data: data,
        labels: labels,
      });
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

app.route("/Chart").get(async (req, res) => {
  const configuration = {
    type: "line", // for line chart
    data: {
      labels: [150, 300, 450, 600, 750, 900, 1050, 1200, 1350, 1500],
      datasets: [
        {
          label: "sample 1",
          data: [100, 43],
          fill: false,
          borderColor: ["rgba(255, 99, 132, 1)"],
          borderWidth: 1,
          xAxisID: "xAxis1", //define top or bottm axis ,modifies on scale
        },
        {
          label: "sample 2",
          data: [72, 83],
          fill: false,
          borderColor: ["rgba(265, 99, 132, 1)"],
          borderWidth: 1,
          xAxisID: "xAxis1",
        },
        {
          label: "sample3",
          data: [30, 56],
          fill: false,
          borderColor: ["rgba(235, 99, 122, 1)"],
          borderWidth: 1,
          xAxisID: "xAxis1",
        },
      ],
    },
    options: {
      scales: {
        xAxes: [
          {
            id: "xAxis1",
            position: "bottom",
            type: "category",
          },
          {
            id: "xAxis2",
            position: "top",
            type: "category",
            ticks: {
              callback: function (value, index, values) {
                return xLabels[index]; // gives points of top x axis
              },
            },
          },
        ],
        yAxes: [
          {
            display: true,
            ticks: {
              max: 200,
              stepSize: 10, //defines y axis step scale
            },
          },
        ],
      },
    },
  };

  const dataUrl = await nodeChartCanvas.renderToDataURL(configuration); // converts chart to image
  res.send(dataUrl);
});

let port = 5000;

app.listen(port, function () {
  console.log("Server has started successfully.");
});
