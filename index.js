const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rpdmsk8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeaders = req.headers.authorization;
  if (!authHeaders) {
    return res.status(401).send({ message: "Anauthorize Access" });
  }
  const token = authHeaders.split(" ")[1];
  jwt.verify(token, process.env.SECRET_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ Messgae: "Access forbidden" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const doctorPortalsCollection = client
      .db("doctors_portal")
      .collection("services");
    const bookingCollection = client
      .db("doctors_portal")
      .collection("bookings");
    const usersCollection = client.db("doctors_portal").collection("users");

    // get all users
    app.get("/allUsers", verifyJWT, async (req, res) => {
      const query = {};
      const users = usersCollection.find(query);
      const cursor = await users.toArray();
      res.send(cursor);
    });

    // Handle user
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ result, token });
    });

    // Handle Admin
    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount?.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        const token = jwt.sign({ email: email }, process.env.SECRET_TOKEN, {
          expiresIn: "1h",
        });
        res.send({ result, token });
      } else {
        return res.status(403).send({ messgae: "Forbidden" });
      }
    });

    // Get all Service
    app.get("/allServices", async (req, res) => {
      const query = {};
      const allServices = doctorPortalsCollection.find(query);
      const cursor = await allServices.toArray();
      res.send(cursor);
    });

    // get all specific user booking
    app.get("/booking", verifyJWT, async (req, res) => {
      const email = req.query.patientEmail;
      const decodedEmail = req.decoded.email;

      if (decodedEmail === email) {
        const query = { patientEmail: email };
        const result = bookingCollection.find(query);
        const cursor = await result.toArray();
        res.send(cursor);
      } else {
        return res.status(403).send({ message: "Forbidden Access" });
      }
    });

    // Warning this is not proper way to filtering something. After you learn you use agreegate lookup
    app.get("/avaiable", async (req, res) => {
      const date = req.query.date;

      // Step : 1
      // Get All services
      const avaiableServices = await doctorPortalsCollection.find().toArray();

      // Step :2
      // Get the booking of the day
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      // Step :3
      // for each service, find booking for that service
      avaiableServices.forEach((service) => {
        const bookingService = bookings.filter(
          (b) => b.treatmentName === service.name
        );
        const bookedSlots = bookingService.map((s) => s.slot);
        const avaiableSlots = service.slots.filter(
          (s) => !bookedSlots.includes(s)
        );
        service.slots = avaiableSlots;
        // service.bookedSlots = bookedSlots;
        // service.bookedSlots = bookingService.map((s) => s.slot);
      });
      res.send(avaiableServices);
    });

    // Post Booking Data
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      // Just Checking for filtering like one user just can book one service for onace
      const query = {
        treatmentName: booking.treatmentName,
        date: booking.date,
        patient: booking.patient,
      };
      const exist = await bookingCollection.findOne(query);
      if (exist) {
        return res.send({ success: false, booking: exist });
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    });

    // Chekc admin
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
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
