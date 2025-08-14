-- Trigger para crear automáticamente un registro en 'usuarios' cuando se crea un usuario en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol, activo)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)), 
    'trabajador', -- Rol por defecto
    true
  )
  ON CONFLICT (id) DO NOTHING; -- Si ya existe, no hacer nada
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se activa cuando se crea un nuevo usuario en auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
