const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
// doctorsUser
// ZhAWjmoTsm15XbBZ
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rpdmsk8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const doctorPortalsCollection = client
      .db("doctors_portal")
      .collection("services");

    // Get all Service
    app.get("/allServices", async (req, res) => {
      const query = {};
      const allServices = doctorPortalsCollection.find(query);
      const cursor = await allServices.toArray();
      res.send(cursor);
    });
  } finally {
    // client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Doctors Portal!");
});

app.listen(port, () => {
  console.log(`Doctors app listening on port ${port}`);
});
