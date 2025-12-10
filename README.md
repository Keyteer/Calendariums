# Calendariums

## Instalación:

Instalar Node.js:  
https://nodejs.org/en/download/current

Descargar la app Expo Go desde Google Play Store
> O tener emulación de Android local configurada

### Clonar el repositorio:

```bash
git clone https://github.com/Keyteer/Calendariums.git
```
```bash
cd Calendariums
```

## Ejecutar frontend:

### Instalar dependencias:

```bash
cd frontend
```

```bash
npm install
```

### Variables de entorno

```bash
cp .env.example .env #Linux o Mac
copy .env.example .env #Windows
```

### Ejecutar
```bash
npx expo start
```
Leer código qr desde Expo Go Android

## Ejecutar backend:

Todo el backend funciona mediante Docker
```bash
cd Calendariums # Root proyecto
```

### Variables de entorno

```bash
cp .env.example .env #Linux o Mac
copy .env.example .env #Windows
```
Es necesario ingresar las variables faltantes.

### Ejecutar

```bash
docker-compose --env-file .env up 
```