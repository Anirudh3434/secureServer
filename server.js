import Pusher from "pusher";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import https from "https";


const sslKey = fs.readFileSync(path.resolve('./key.pem'));
const sslCert = fs.readFileSync(path.resolve('./cert.pem'));

const app = express ();
app.use(bodyParser.json()); 
app.use(cors(
    {
        origin: "*"
    }
));

app.use(express.urlencoded({ extended: true }));






import linkedinRoutes from "./routes/linkedin.routes.js";
import triggerRoutes from "./routes/trigger.route.js";
import notifyRoutes from "./routes/notify.route.js";



app.use("/linkedin", linkedinRoutes);
app.use("/trigger", triggerRoutes);
app.use("/notify", notifyRoutes);

const httpsServer = https.createServer({ key: sslKey, cert: sslCert }, app);


httpsServer.listen(4000, () => {
  console.log("🚀 Secure Server started on https://localhost:4000");
});


