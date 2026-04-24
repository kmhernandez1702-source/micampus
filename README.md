# 🎓 MiCampus LMS — Guía completa de instalación

Plataforma LMS asincrónica con login, progreso secuencial, videos de YouTube, tareas por formularios y paneles de estudiante/admin.

---

## Stack tecnológico (todo gratuito)

| Componente | Herramienta | Plan gratuito |
|---|---|---|
| Frontend | React + Vite | — |
| Base de datos | Supabase (PostgreSQL) | 500MB, ilimitado |
| Autenticación | Supabase Auth | 50,000 usuarios |
| Hosting | Netlify | 100GB bandwidth/mes |
| Videos | YouTube (privado/no listado) | Gratuito |
| Formularios | Google Forms | Gratuito |

---

## PASO 1 — Configurar Supabase

### 1.1 Crear proyecto
1. Ve a [supabase.com](https://supabase.com) → **New Project**
2. Elige un nombre (ej: `micampus`) y una contraseña segura
3. Selecciona la región más cercana (ej: South America São Paulo)
4. Espera ~2 minutos a que el proyecto se inicialice

### 1.2 Ejecutar el esquema SQL
1. En Supabase → **SQL Editor** → **New Query**
2. Copia y pega todo el contenido de `supabase-schema.sql`
3. Haz clic en **Run** (o Ctrl+Enter)
4. Verifica que aparezcan las tablas en **Table Editor**

### 1.3 Obtener las credenciales
1. Ve a **Settings** → **API**
2. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`

### 1.4 Crear tu primer usuario administrador
1. En Supabase → **Authentication** → **Users** → **Add User**
2. Ingresa tu correo y contraseña
3. Luego ve a **Table Editor** → tabla `profiles`
4. Busca tu usuario y cambia el campo `role` de `student` a `admin`
5. Guarda

---

## PASO 2 — Configurar el proyecto local

### 2.1 Instalar dependencias
```bash
# Asegúrate de tener Node.js 18+ instalado
node --version

# Instalar dependencias
npm install
```

### 2.2 Configurar variables de entorno
```bash
# Copia el archivo de ejemplo
cp .env.example .env.local

# Edita .env.local con tus credenciales de Supabase
VITE_SUPABASE_URL=https://TUPROJECTID.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 2.3 Ejecutar en desarrollo
```bash
npm run dev
# Abre http://localhost:5173
```

---

## PASO 3 — Desplegar la Edge Function (para crear estudiantes)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar sesión
supabase login

# Enlazar con tu proyecto
supabase link --project-ref TU_PROJECT_ID

# Desplegar la función
supabase functions deploy create-user
```

> ⚠️ La función `create-user` es necesaria para que el admin pueda crear estudiantes desde el panel. Sin ella, tendrás que crear usuarios manualmente en Supabase Authentication.

---

## PASO 4 — Desplegar en Netlify (hosting gratuito)

### Opción A — Desde GitHub (recomendado)
1. Sube el proyecto a GitHub: `git init && git add . && git commit -m "Initial commit"`
2. Ve a [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
3. Conecta tu repositorio de GitHub
4. Configuración de build:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Agrega las variables de entorno en Netlify → **Site settings** → **Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Haz clic en **Deploy site**

### Opción B — Deploy manual
```bash
npm run build
# Sube la carpeta /dist a Netlify Drop: app.netlify.com/drop
```

---

## PASO 5 — Usar la plataforma

### Como administrador
1. Inicia sesión con tu cuenta admin
2. Ve a **Cursos** → crear cursos, módulos y clases
3. En cada clase puedes agregar:
   - ID o URL de YouTube (video privado/no listado)
   - Tarea opcional con URL de Google Forms
4. Ve a **Estudiantes** → agregar estudiantes e inscribirlos en cursos

### Como estudiante
1. El estudiante inicia sesión con su correo y contraseña
2. Ve sus cursos y el progreso de cada uno
3. Las clases se desbloquean secuencialmente:
   - **Sin tarea:** ver el video → marcar como completada
   - **Con tarea:** ver el video → abrir formulario → enviarlo → marcar como completada

---

## Estructura del proyecto

```
micampus/
├── src/
│   ├── lib/
│   │   └── supabase.js          # Cliente y helpers de Supabase
│   ├── hooks/
│   │   └── useAuth.jsx          # Context de autenticación
│   ├── components/
│   │   └── shared/
│   │       ├── Sidebar.jsx      # Sidebar reutilizable
│   │       ├── Modal.jsx        # Componente modal
│   │       └── ProgressBar.jsx  # Barra de progreso
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── student/
│   │   │   ├── StudentLayout.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── StudentCourses.jsx
│   │   │   └── StudentLesson.jsx    # ← lógica de bloqueo secuencial
│   │   └── admin/
│   │       ├── AdminLayout.jsx
│   │       ├── AdminDashboard.jsx
│   │       ├── AdminStudents.jsx
│   │       ├── AdminCourses.jsx     # ← CRUD completo de contenido
│   │       └── AdminProgress.jsx
│   ├── App.jsx                  # Router principal
│   ├── main.jsx
│   └── index.css                # Estilos globales
├── supabase/
│   └── functions/
│       └── create-user/
│           └── index.ts         # Edge Function para crear usuarios
├── supabase-schema.sql          # ← EJECUTAR PRIMERO en Supabase
├── netlify.toml                 # Config de Netlify para SPA
├── .env.example                 # Template de variables de entorno
└── package.json
```

---

## Preguntas frecuentes

**¿Cómo agrego un video de YouTube privado?**
1. Sube el video a YouTube como "No listado" o "Privado"
2. Copia el ID del video (la parte después de `v=` en la URL)
3. Pégalo en el campo "ID del video" al crear la clase

**¿Se puede usar otro formulario en lugar de Google Forms?**
Sí, cualquier URL de formulario funciona: Google Forms, Typeform, Jotform, etc.

**¿Cómo activo las notificaciones por email?**
Usa [Resend.com](https://resend.com) (3,000 emails/mes gratis) + Supabase Database Webhooks para disparar emails cuando un estudiante completa una lección.

**¿Cómo agrego un dominio personalizado?**
En Netlify → **Domain settings** → **Add custom domain**. Gratis con tu propio dominio.

**¿Cuántos usuarios soporta el plan gratuito?**
- Supabase: hasta 50,000 usuarios registrados
- Netlify: 100GB de bandwidth/mes
- YouTube: sin límite de visualizaciones

---

## Soporte y personalización

Este proyecto está listo para producción. Podés extenderlo con:
- 📧 Emails de bienvenida (Supabase + Resend)
- 🏅 Certificados PDF al completar un curso
- 💬 Foro/comentarios por clase
- 📱 App móvil (React Native con la misma API de Supabase)
