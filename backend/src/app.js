
import 'dotenv/config';
import express from "express";

// Rutas
import eventsRoutes from "./routes/events.routes.js";

require('dotenv').config();
const app = express()
app.use(express.json());
const port = process.env.PORT || 6969;

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Registrar rutas
app.use("/events", eventsRoutes);

export default app;
