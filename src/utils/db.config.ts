import mongoose from "mongoose";

const DB_NAME = "socio_africa_demo_news_feed";
const connect_mongodb = async () => {
  const URL =
    process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "test"
      ? `mongodb://${process.env.MONGODB_LOCAL_USERNAME}:${
          process.env.MONGODB_LOCAL_PASSWORD
        }@${
          process.env.MONGODB_LOCAL_HOST || "localhost:27017"
        }/${DB_NAME}?authSource=admin`
      : `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@socioafrica.x73b2.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`;

  console.table("URL", [URL]);

  const con = await mongoose.connect(URL);

  if (con) console.log("CONNECTED TO MONGODB DATABASE SUCCESSFULLY");
};

export default connect_mongodb;
