import 'dotenv/config';
import express from "express";

// Rutas
import eventsRouter from "./routes/events.routes.js";

const app = express()

app.use(express.json());



// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Registrar tus rutas reales
app.use("/events", eventsRouter);

export default app;