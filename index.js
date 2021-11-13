const express = require("express");
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;

const port = process.env.PORT || 5000;

// jwt token server site
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middle war
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// database connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ez71i.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

//  mongo db connection
async function run() {
  try {
    await client.connect();
    const database = client.db("cycle_Shop");
    const productsCollection = database.collection("products");
    const ordersCollection = database.collection("orders");
    const reviewCollection = database.collection("review");
    const usersCollection = database.collection("users");

    // add products collection
    app.post("/addProducts", async (req, res) => {
      const result = await productsCollection.insertOne(req.body);
      res.send(result);
    });

    // get all products
    app.get("/allProducts", async (req, res) => {
      const result = await productsCollection.find({}).toArray();
      res.send(result);
    });

    // single products details
    app.get("/productDetails/:id", async (req, res) => {
      const result = await productsCollection.findOne({
        _id: ObjectId(req.params.id),
      });
      res.send(result);
    });

    // order to database
    app.post("/addOrders", async (req, res) => {
      const result = await ordersCollection.insertOne(req.body);
      res.send(result);
    });

    // my order
    app.get("/myOrder/:email", async (req, res) => {
      console.log(req.params.email);
      const result = await ordersCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(result);
    });

    // get order items
    app.get("/orders", async (req, res) => {
      const result = await ordersCollection.find({}).toArray();
      res.send(result);
    });

    // Delete product
    app.delete("/productItem/:id", async (req, res) => {
      const result = await productsCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.json(result);
      console.log(result);
    });
    // Delete order item
    app.delete("/orderItem/:id", async (req, res) => {
      const result = await ordersCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.json(result);
      console.log(result);
    });

    // update Product
    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const updateInfo = req.body;
      const result = await productsCollection.updateOne(
        { _id: ObjectId(id) },
        {
          $set: {
            name: updateInfo.name,
            price: updateInfo.price,
            image: updateInfo.image,
            category: updateInfo.category,
            description: updateInfo.description,
          },
        }
      );
      res.send(result);
    });

    // status Update
    app.put("/statusUpdate/:id", async (req, res) => {
      const filter = { _id: ObjectId(req.params.id) };
      const result = await ordersCollection.updateOne(filter, {
        $set: {
          status: req.body.status,
        },
      });
      res.send(result);
      console.log(result);
    });

    // review post
    app.post("/addReview", async (req, res) => {
      const result = await reviewCollection.insertOne(req.body);
      res.send(result);
    });

    // get order items
    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find({}).toArray();
      res.send(result);
    });

    // get users
    app.get("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    // user post
    app.post("/users", async (req, res) => {
      const result = await usersCollection.insertOne(req.body);
      res.json(result);
    });

    // Upsert user
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateInfo = { $set: user };
      const result = usersCollection.updateOne(filter, updateInfo, options);
      res.json(result);
    });

    // make admin
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requsterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requsterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateInfo = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateInfo);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "you do not have access to make admin" });
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Good news for RIder, we are All bike discount for You.");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
