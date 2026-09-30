import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectDB } from "./config/db.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import userRoutes from "./routes/user.routes.js";
import registerRoutes from "./routes/register.routes.js";
import loginRoutes from "./routes/login.routes.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "API de recuperacion Backend funcionando" });
});

app.use("/api/users", userRoutes);
app.use("/api/register", registerRoutes);
app.use("/api/login", loginRoutes);
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Servidor ejecutandose en http://localhost:${port}`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor:", error.message);
    process.exit(1);
  }
};

startServer();
