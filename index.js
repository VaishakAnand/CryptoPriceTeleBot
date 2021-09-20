require("dotenv").config();
const express = require("express");
const routes = require("./routes/routes.js");

const app = express();

app.listen(process.env.PORT || 2000);

app.get("/", (req, res) => {
  res.status(200).send("Hey");
});

app.use("/api", routes);

app.all("*", (req, res) => {
  res.status(400).send("Not a functional endpoint");
})

exports.app = app;
