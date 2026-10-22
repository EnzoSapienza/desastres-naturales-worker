# Pasos para subir una alerta

## Conseguir clave privada
1. Configuración del Proyecto
2. Cuentas de Servicio
3. Generar nueva clave privada
4. Renombrar el archivo como "sa.json" y ponerlo en la carpeta scripts/

## Conseguir API Key
1. Configuración del Proyecto
2. General
3. App Web
4. Copiar donde dice "apiKey" y pegarlo cuando te lo pida.

## Conseguir UID autorizado
1. Archivos de Firestore
2. Usuarios
3. Buscar tu usuario. Debe tener rol "tester" (minúsculas).
4. Copiar el UID y pegarlo cuando te lo pida

## Enviar alerta
1. Abrir la terminal en la carpeta /scripts
2. Ejecutar ‘node enviar-alerta.js‘
3. Pegar los datos que te pida (la primera vez).
4. Seleccionar una latitud, longitud, radio y tipo.
5. Escribir "S" y apretar enter
