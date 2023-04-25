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
    res.render("Spatial_Analysis", { data: 0, labels: 0 });
  })
  .post(async (req, res) => {
    var { location, time, fullDate } = req.body;

    const date = new Date(fullDate).getDate() + 1;
    const months = new Date(fullDate).getMonth() + 1;
    location = location.split("-")[1];
    time = time.split(":")[0];

    connectDB(
      // `SELECT * FROM LOCATION=${location} WHERE YEAR=${year} and TIME=${day}`
      `
SELECT offense_category, COUNT(*) as num_offenses
FROM agency
INNER JOIN
incident
ON agency.agency_id = incident.agency_id
INNER JOIN
offense
ON offense.incident_id = incident.incident_id
WHERE agency.state='${location}' 
AND EXTRACT(MONTH FROM date_of)=${months} 
AND EXTRACT(DAY FROM date_of)=${date}
AND hour_of = ${time}
GROUP BY offense.offense_category
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
    res.render("Trend_Analysis", { data: 0 });
  })
  .post(async (req, res) => {
    var { state, crimeType, year } = req.body;

    state = state.split("-")[1];

    connectDB(
      `SELECT EXTRACT(MONTH FROM date_of) as month, COUNT(*)
FROM agency
INNER JOIN
incident
ON agency.agency_id = incident.agency_id
INNER JOIN
offense
ON offense.incident_id = incident.incident_id
WHERE state='${state}' AND offense_category='${crimeType}'
AND EXTRACT(YEAR FROM date_of)=${year}
GROUP BY EXTRACT(MONTH FROM date_of)
ORDER BY month
`
    ).then((result) => {
      // console.log(result);

      const data = [];

      result.rows.forEach((element, index) => {
        data.push(element[1]);
      });

      // result.
      res.render("Trend_Analysis", { data: data });
    });
  });

app
  .route("/SectorAnalysis")
  .get(async (req, res) => {
    res.render("Offence_Analysis", { data: 0, labels: 0 });
  })
  .post(async (req, res) => {
    const {
      offenceType,
      offenderSex,
      offenderRace,
      offenderEthnicity,
      locationType,
      victimSex,
      victimRace,
      victimEthnicity,
    } = req.body;

    var prompt = "";
    var small_prompt = "";
    var unknown_name = "";
    var N = 0;

    if (offenceType) {
      prompt = offenceType;
      small_prompt = "offense_category";
      unknown_name = "Other Offenses";
    }
    if (offenderSex) {
      prompt = offenderSex;
      small_prompt = "sex";
      unknown_name = "F";
    }
    if (offenderRace) {
      prompt = offenderRace;
      small_prompt = "race";
      unknown_name = "Unknown";
    }
    if (offenderEthnicity) {
      prompt = offenderEthnicity;
      small_prompt = "ethnicity";
      unknown_name = "Unknown";
    }
    if (locationType) {
      prompt = locationType;
      small_prompt = "location_type";
      unknown_name = "Other/Unknown";
    }
    if (victimSex) {
      prompt = victimSex;
      small_prompt = "sex";
      unknown_name = "U";
    }
    if (victimRace) {
      prompt = victimRace;
      small_prompt = "race";
      unknown_name = "Not Specified";
    }
    if (victimEthnicity) {
      prompt = victimEthnicity;
      small_prompt = "ethnicity";
      unknown_name = "Unknown";
    }

    console.log(prompt, small_prompt, unknown_name);

    connectDB(
      // `SELECT * FROM LOCATION=${location} WHERE YEAR=${year} and TIME=${day}`
      `
      SELECT ${small_prompt}, SUM(num_incidents) as num_incidents FROM
(SELECT * FROM
    (SELECT ${prompt} as ${small_prompt}, COUNT(*) as num_incidents
    FROM
        agency
        INNER JOIN 
        incident
        ON agency.agency_id = incident.agency_id
        INNER JOIN 
        offense
        ON incident.incident_id = offense.incident_id
        INNER JOIN
        victim
        ON victim.incident_id = incident.incident_id
        INNER JOIN
        arrestee
        ON arrestee.incident_id = incident.incident_id
    GROUP BY ${prompt}
    ORDER BY num_incidents DESC
    FETCH FIRST 10 ROWS ONLY)
UNION
SELECT '${unknown_name}' as ${small_prompt}, SUM(num_incidents) as num_incidents
FROM(
    SELECT ${prompt}, COUNT(*) as num_incidents
    FROM
        agency
        INNER JOIN 
        incident
        ON agency.agency_id = incident.agency_id
        INNER JOIN 
        offense
        ON incident.incident_id = offense.incident_id
        INNER JOIN
        victim
        ON victim.incident_id = incident.incident_id
        INNER JOIN
        arrestee
        ON arrestee.incident_id = incident.incident_id
    GROUP BY ${prompt}
    ORDER BY num_incidents DESC
    OFFSET 10 ROWS))
GROUP BY ${small_prompt}
ORDER BY num_incidents DESC

      `
    ).then((result) => {
      const labels = [];
      const data = [];

      result.rows.forEach((ele) => {
        labels.push(ele[0]);
        data.push(ele[1]);
      });
      res.render("Offence_Analysis", { labels: labels, data: data });
    });
  });

app
  .route("/Correlation")
  .get(async (req, res) => {
    res.render("Correlation", { x: 0, y: 0, xLabel: 0, yLabel: 0 });
  })
  .post(async (req, res) => {
    const {
      victim_age1,
      offender_age1,
      hour1,
      victim_age2,
      offender_age2,
      hour2,
    } = req.body;

    var prompt1 = "";
    var prompt2 = "";
    var xLabel = "";
    var yLabel = "";

    if (victim_age1) {
      prompt1 = victim_age1;
      xLabel = "Victim Age";
    }
    if (offender_age1) {
      prompt1 = offender_age1;
      xLabel = "Offender Age";
    }
    if (hour1) {
      prompt1 = hour1;
      xLabel = "Hour";
    }
    if (victim_age2) {
      prompt2 = victim_age2;
      yLabel = "Victim Age";
    }
    if (offender_age2) {
      prompt2 = offender_age2;
      yLabel = "Offender Age";
    }
    if (hour2) {
      prompt2 = hour2;
      yLabel = "Hour";
    }

    console.table(req.body);
    console.log(prompt1, prompt2);
    connectDB(
      `SELECT CAST(${prompt1} as INT) as offender_age, CAST(${prompt2} as INT) as victim_age
FROM incident
INNER JOIN
victim
ON victim.incident_id = incident.incident_id
INNER JOIN
arrestee
ON arrestee.incident_id = incident.incident_id
WHERE arrestee.age > 0 
AND victim.age != 'NS' AND victim.age != 'BB'
AND victim.age != 'NN' AND victim.age != 'NB'
AND victim.age != 0
ORDER BY DBMS_RANDOM.RANDOM
FETCH FIRST 200 ROWS ONLY
`
    ).then((result) => {
      const x = [];
      const y = [];

      result.rows.forEach((ele) => {
        x.push(ele[0]);
        y.push(ele[1]);
      });
      res.render("Correlation", { x: x, y: y, xLabel: xLabel, yLabel: yLabel });
    });
  });

app
  .route("/Statistics")
  .get(async (req, res) => {
    res.render("Statistics", {
      min: 0,
      avg: 0,
      max: 0,
      labels: 0,
      yAxisParameter: 0,
    });
  })
  .post(async (req, res) => {
    const { OffenderAge, VictimAge, Hour, Weapon, Sex, Race } = req.body;

    var parameter1 = "";
    var parameter2 = "";
    var yAxisParameter = "";

    if (OffenderAge == "OffenderAge") {
      parameter1 = "arrestee.age";
      yAxisParameter = "Offender's Age";
    }
    if (VictimAge == "VictimAge") {
      parameter1 = "victim.age";
      yAxisParameter = "Victim's Age";
    }
    if (Hour == "Hour") {
      parameter1 = "incident.hour_of";
      yAxisParameter = "Hour";
    }

    if (Weapon == "Weapon") {
      parameter2 = "weapon";
      yAxisParameter = "Weapon";
    }
    if (Sex == "Offense Type") {
      parameter2 = "offense.offense_category";
      yAxisParameter = "Offense Type";
    }
    if (Race == "Location Type") {
      parameter2 = "offense.location_type";
      yAxisParameter = "Location Type";
    }

    connectDB(
      // `SELECT * FROM LOCATION=${location} WHERE YEAR=${year} and TIME=${day}`
      `SELECT ${parameter2}, MIN(CAST(${parameter1} as INT)) as min_age, AVG(CAST(${parameter1} as INT)) as avg_age, MAX(CAST(${parameter1} as INT)) as max_age
FROM agency
INNER JOIN
incident
ON agency.agency_id = incident.agency_id
INNER JOIN
offense
ON offense.incident_id = incident.incident_id
INNER JOIN
arrestee
ON arrestee.incident_id = incident.incident_id
INNER JOIN
victim
ON victim.incident_id = incident.incident_id
WHERE arrestee.age > 0
AND victim.age != 'NS' AND victim.age != 'BB'
AND victim.age != 'NN' AND victim.age != 'NB'
AND victim.age != 0
GROUP BY ${parameter2}
`
    ).then((result) => {
      // console.log(result);
      const min = [];
      const avg = [];
      const max = [];
      const labels = [];

      result.rows.forEach((ele) => {
        console.log(ele);
        if (ele[0] == "Sex Offenses, Non-forcible") {
          return;
        }
        labels.push(ele[0]);
        min.push(ele[1]);
        avg.push(ele[2]);
        max.push(ele[3]);
      });

      res.render("Statistics", {
        min: min,
        avg: avg,
        max: max,
        labels: labels,
        yAxisParameter: yAxisParameter,
      });
    });
  });

let port = 5000;

app.listen(port, function () {
  console.log("Server has started successfully.");
});
