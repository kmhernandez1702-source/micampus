-- ================================================================
-- MICAMPUS LMS — Esquema completo de base de datos
-- Ejecuta este SQL en: Supabase → SQL Editor → New Query
-- ================================================================

-- 1. TABLA DE PERFILES (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. TABLA DE CURSOS
CREATE TABLE IF NOT EXISTS public.courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT DEFAULT '📚',
  color       TEXT DEFAULT '#e8f5f3',
  published   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- 3. TABLA DE MÓDULOS
CREATE TABLE IF NOT EXISTS public.modules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- 4. TABLA DE LECCIONES / CLASES
CREATE TABLE IF NOT EXISTS public.lessons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id           UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  video_id            TEXT,          -- ID o URL de YouTube
  has_task            BOOLEAN DEFAULT false,
  task_name           TEXT,
  task_url            TEXT,          -- URL de Google Forms
  task_instructions   TEXT,
  order_index         INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- 5. TABLA DE INSCRIPCIONES
CREATE TABLE IF NOT EXISTS public.enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);


-- 6. TABLA DE PROGRESO
CREATE TABLE IF NOT EXISTS public.progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id           UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id           UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed           BOOLEAN DEFAULT false,
  completed_at        TIMESTAMPTZ,
  task_submitted      BOOLEAN DEFAULT false,
  task_submitted_at   TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);


-- ================================================================
-- POLÍTICAS DE SEGURIDAD (Row Level Security)
-- ================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Usuarios ven su perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins ven todos los perfiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Usuarios actualizan su perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins actualizan perfiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Sistema inserta perfiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- COURSES (lectura pública para inscritos, escritura solo admins)
CREATE POLICY "Todos leen cursos" ON public.courses
  FOR SELECT USING (true);
CREATE POLICY "Admins gestionan cursos" ON public.courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- MODULES
CREATE POLICY "Todos leen módulos" ON public.modules
  FOR SELECT USING (true);
CREATE POLICY "Admins gestionan módulos" ON public.modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- LESSONS
CREATE POLICY "Todos leen lecciones" ON public.lessons
  FOR SELECT USING (true);
CREATE POLICY "Admins gestionan lecciones" ON public.lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ENROLLMENTS
CREATE POLICY "Estudiantes ven sus inscripciones" ON public.enrollments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins gestionan inscripciones" ON public.enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- PROGRESS
CREATE POLICY "Estudiantes ven y actualizan su progreso" ON public.progress
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins leen todo el progreso" ON public.progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ================================================================
-- DATOS DE EJEMPLO (opcional — borra esto si quieres empezar limpio)
-- ================================================================

-- Insertar un curso de ejemplo (se puede hacer desde el panel admin también)
-- INSERT INTO public.courses (name, description, icon, color)
-- VALUES ('Mi primer curso', 'Descripción del curso', '🚀', '#e8f5f3');
