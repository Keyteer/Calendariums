import 'dotenv/config';
import express from "express";

// Rutas
import eventsRoutes from "./routes/events.js";


const app = express()
app.use(express.json());
app.use("/events", eventsRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Registrar tus rutas reales
app.use("/events", eventsRouter);

export default app;