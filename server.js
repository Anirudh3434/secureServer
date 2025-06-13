import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import https from "https";

// Read SSL certificate and key
const sslKey = fs.readFileSync(path.resolve('./key.pem'));
const sslCert = fs.readFileSync(path.resolve('./cert.pem'));

const app = express();

app.use(bodyParser.json());
app.use(cors({ origin: "*" }));
app.use(express.urlencoded({ extended: true }));

// Import routes
import linkedinRoutes from "./routes/linkedin.routes.js";
import triggerRoutes from "./routes/trigger.route.js";
import notifyRoutes from "./routes/notify.route.js";
import jobMatchRoutes from "./routes/job.match.routes.js";

// Route usage
app.use("/linkedin", linkedinRoutes);
app.use("/trigger", triggerRoutes);
app.use("/notify", notifyRoutes);
app.use("/job-match", jobMatchRoutes);

// Test route
app.post("/test", (req, res) => {
  res.send("✅ Secure server connected successfully");
});

// Create HTTPS server
https.createServer({ key: sslKey, cert: sslCert }, app).listen(4000, () => {
  console.log("🚀 Secure HTTPS server started on https://localhost:4000");
});
