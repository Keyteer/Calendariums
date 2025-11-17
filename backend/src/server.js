import app from "./app.js";

const port = 6969;
const host = '0.0.0.0'; // Escuchar en todas las interfaces de red

app.listen(port, host, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
  console.log(`Accesible desde tu red en http://192.168.100.3:${port}`);
});
