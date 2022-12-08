const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
    const bookingCollection = client
      .db("doctors_portal")
      .collection("bookings");

    // Get all Service
    app.get("/allServices", async (req, res) => {
      const query = {};
      const allServices = doctorPortalsCollection.find(query);
      const cursor = await allServices.toArray();
      res.send(cursor);
    });

    app.get("/avaiable", async (req, res) => {
      const date = req.body.date || "Dec 8, 2022";

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
        service.avaiableSlots = avaiableSlots;
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
