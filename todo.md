├── frontend/                   # Frontend (React + Vite)
│   ├── public/                 # Iconos PWA y Manifest
│   │   └── icons/
│   ├── src/
│   │   ├── assets/             # Imágenes y fuentes
│   │   ├── components/         # Componentes transversales (BEM)
│   │   ├── context/            # Estado global (Auth, Blíster actual)
│   │   ├── hooks/              # Lógica reutilizable
│   │   ├── pages/              # Vistas principales (Home, Perfil, etc.)
│   │   ├── services/           # Llamadas a la API (Axios/Fetch)
│   │   ├── scss/               # Arquitectura ITCSS
│   │   │   ├── 1-settings/     # Variables, paleta de colores
│   │   │   ├── 2-tools/        # Mixins y funciones
│   │   │   ├── 3-generic/      # Reset (Normalize.css)
│   │   │   ├── 4-elements/     # Estilos de etiquetas base (h1, input)
│   │   │   ├── 5-objects/      # Estructuras de layout (grids, containers)
│   │   │   ├── 6-components/   # Estilos específicos de componentes
│   │   │   ├── 7-utilities/    # Clases de ayuda (u-margin, etc.)
│   │   │   └── main.scss       # Archivo maestro (importador)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example            # Ejemplo de variables de entorno front
│   ├── Dockerfile              # Configuración Docker para el cliente
│   ├── package.json
│   └── vite.config.js          # Configuración de Vite + PWA Plugin
│
├── backend/                    # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/             # Conexión a MongoDB Atlas
│   │   ├── controllers/        # Lógica de controladores (REQ/RES)
│   │   ├── middleware/         # Auth (JWT), validación de roles
│   │   ├── models/             # Esquemas de Mongoose
│   │   ├── routes/             # Definición de rutas de la API
│   │   ├── mcp/                # Implementación del Servidor MCP
│   │   ├── utils/              # Funciones de ayuda (formateo, etc.)
│   │   └── index.js            # Punto de entrada de la aplicación
│   ├── .env.example            # Ejemplo de variables de entorno back
│   ├── Dockerfile              # Configuración Docker para el servidor
│   └── package.json
│
├── docs/                       # Documentación según Rúbrica
│   ├── assets/                 # Capturas de pantalla y diagramas
│   ├── 01-introduccion.md
│   ├── 02-descripcion.md
│   ├── 03-instalacion.md
│   ├── 04-guia-estilos.md
│   ├── 05-diseno.md
│   ├── 06-desarrollo.md
│   ├── 07-pruebas.md
│   ├── 08-despliegue.md
│   ├── 09-manual-usuario.md
│   └── 10-conclusiones.md
│
├── .gitignore                  # Excluir node_modules, .env, etc.
├── docker-compose.yml          # Orquestador de contenedores
├── README.md                   # Presentación del proyecto
└── .env                        # Variables reales (NO SUBIR A GITHUB)