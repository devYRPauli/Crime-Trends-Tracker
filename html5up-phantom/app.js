const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require("express-session");
const http = require("http");
const oracledb = require("oracledb");
const app = express();

app.set("view engine", "ejs");

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

const connectDB = async () => {
  try {
    const connection = await oracledb.getConnection({
      user: "pandey.yash",
      password: "7La7ofRRpsWEPeXjr5q63hTL",
      connectionString: "oracle.cise.ufl.edu/orcl",
    });
    const result = await connection.execute("SELECT * FROM Student");
    return result;
  } catch (error) {
    console.log("39 = ", error);
  }
};

connectDB().then((res) => console.log(res));

let port = 5000;

app.listen(port, function () {
  console.log("Server has started successfully.");
});
