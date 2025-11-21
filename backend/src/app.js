import express from "express";
// Rutas
import eventsRoutes from "./routes/events.routes.js";
import eventTypesRoutes from "./routes/event-types.routes.js";

const app = express()
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Registrar rutas
app.use("/events", eventsRoutes);
app.use("/event-types", eventTypesRoutes);

export default app;
