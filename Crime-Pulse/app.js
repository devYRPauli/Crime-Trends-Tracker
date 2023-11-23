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

// oracledb.initOracleClient({
//   libDir:
//     "D:\\Downloads\\instantclient-basic-windows.x64-21.9.0.0.0dbru\\instantclient_21_9",
// });

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
  console.log("Chart ready to use.");
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
  .route("/CrimeTrendPercentages")
  .get(async (req, res) => {
    res.render("Spatial_Analysis", {
      changes_state_1: "",
      changes_state_2: "",
      location_1: "",
      location_2: "",
      category: "",
    });
  })
  .post(async (req, res) => {
    var { location_1, location_2, crime_category } = req.body;

    location_1 = location_1.split("-")[1];
    location_2 = location_2.split("-")[1];

    connectDB(
      `
SELECT 
    State,
    Offense_Category,
    Month,
    Offense_Count,
    Previous_Month_Count,
    CASE 
        WHEN Previous_Month_Count IS NULL THEN NULL
        ELSE (Offense_Count - Previous_Month_Count) / Previous_Month_Count * 100 
    END AS Percentage_Change
FROM (
    SELECT 
        mo.State,
        mo.Offense_Category,
        mo.Month,
        mo.Offense_Count,
        LAG(mo.Offense_Count, 1) OVER (PARTITION BY mo.State, mo.Offense_Category ORDER BY mo.Month) AS Previous_Month_Count
    FROM (
        SELECT 
            a.State,
            o.Offense_Category,
            TO_CHAR(inc.Date_OF, 'MM-YYYY') AS Month,
            COUNT(*) AS Offense_Count
        FROM Incident inc
        JOIN Agency a ON inc.Agency_ID = a.Agency_ID
        JOIN Offense o ON inc.Incident_ID = o.Incident_ID
        WHERE EXTRACT(YEAR FROM inc.Date_OF) = 2021
              AND a.State IN ('${location_1}', '${location_2}')
              AND o.Offense_Category = '${crime_category}'
        GROUP BY a.State, o.Offense_Category, TO_CHAR(inc.Date_OF, 'MM-YYYY')
    ) mo
) final
ORDER BY State, Offense_Category, Month
      `
    ).then(async (result) => {
      const changes_state_1 = [];
      const changes_state_2 = [];

      for (let i = 1; i < 12; i++) {
        changes_state_1.push(result.rows[i][result.rows[i].length - 1]);
      }

      for (let i = 13; i < 24; i++) {
        changes_state_2.push(result.rows[i][result.rows[i].length - 1]);
      }

      res.render("Spatial_Analysis", {
        changes_state_1: changes_state_1,
        changes_state_2: changes_state_2,
        location_1: location_1,
        location_2: location_2,
        category: crime_category,
      });
    });
  });

app
  .route("/TrendAnalysis")
  .get(async (req, res) => {
    res.render("Trend_Analysis", { data: 0 });
  })
  .post(async (req, res) => {
    var { state, crime_category } = req.body;

    state = state.split("-")[1];

    connectDB(
      `WITH DaytimeCrimes AS (
    SELECT 
        a.State,
        TO_CHAR(inc.Date_OF, 'MM-YYYY') AS Month,
        TO_CHAR(inc.Date_OF, 'WW') AS Week,
        COUNT(*) AS Daytime_Crime_Count
    FROM Incident inc
    JOIN Offense o ON inc.Incident_ID = o.Incident_ID
    JOIN Agency a ON inc.Agency_ID = a.Agency_ID
    WHERE EXTRACT(YEAR FROM inc.Date_OF) = 2021
          AND a.State IN ('${state}')
          AND inc.Hour_OF >= 6 AND inc.Hour_OF < 18
          AND o.Offense_Category IN ('${crime_category}')
    GROUP BY a.State, TO_CHAR(inc.Date_OF, 'MM-YYYY'), TO_CHAR(inc.Date_OF, 'WW')
),
NighttimeCrimes AS (
    SELECT 
        a.State,
        TO_CHAR(inc.Date_OF, 'MM-YYYY') AS Month,
        TO_CHAR(inc.Date_OF, 'WW') AS Week,
        COUNT(*) AS Nighttime_Crime_Count
    FROM Incident inc
    JOIN Offense o ON inc.Incident_ID = o.Incident_ID
    JOIN Agency a ON inc.Agency_ID = a.Agency_ID
    WHERE EXTRACT(YEAR FROM inc.Date_OF) = 2021
          AND a.State IN ('${state}')
          AND (inc.Hour_OF < 6 OR inc.Hour_OF >= 18)
          AND o.Offense_Category IN ('${crime_category}')
    GROUP BY a.State, TO_CHAR(inc.Date_OF, 'MM-YYYY'), TO_CHAR(inc.Date_OF, 'WW')
)
SELECT 
    dc.State,
    dc.Month,
    dc.Week,
    COALESCE(dc.Daytime_Crime_Count, 0) AS Weekly_Daytime_Crimes,
    COALESCE(nc.Nighttime_Crime_Count, 0) AS Weekly_Nighttime_Crimes
FROM DaytimeCrimes dc
FULL OUTER JOIN NighttimeCrimes nc 
    ON dc.State = nc.State AND dc.Month = nc.Month AND dc.Week = nc.Week
ORDER BY dc.State, dc.Month, dc.Week

`
    ).then((result) => {
      // console.log(result);
      day_time = [];
      night_time = [];
      console.log(result);
      // res.send(result);

      for (let i = 0; i < result.rows.length - 1; i += 2) {
        day_time.push(
          result.rows[i][result.rows[i].length - 2] +
            result.rows[i + 1][result.rows[i + 1].length - 2]
        );
        night_time.push(
          -1 *
            (result.rows[i][result.rows[i].length - 1] +
              result.rows[i + 1][result.rows[i + 1].length - 1])
        );
      }
      result.rows.forEach((ele) => {
        day_time.push(ele[ele.length - 2]);
        night_time.push(-1 * ele[ele.length - 1]);
      });

      const data = [day_time, night_time];

      // result.rows.forEach((element, index) => {
      //   data.push(element[1]);
      // });

      // // result.
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
      console.log(result);
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
