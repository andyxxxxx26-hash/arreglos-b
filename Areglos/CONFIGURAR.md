# Conectar la tienda con Supabase

La tienda conserva un catálogo de muestra hasta que conectes un proyecto Supabase. El panel privado está en `admin.html`; las reglas de acceso se aplican en la base de datos, así que solo ocultar la dirección del panel no es la protección.

## 1. Crear el proyecto

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. En **SQL Editor**, abre `supabase-setup.sql` y ejecuta el contenido completo. Esto crea la tabla de productos, el espacio público para mostrar imágenes y las políticas RLS que reservan las modificaciones a administradores.
3. En **Project Settings → API**, copia la **Project URL** y la clave **anon/publishable**. No uses ni compartas la `service_role`/secret key en esta web.
4. Pega esos dos valores en `supabase-config.js`, reemplazando `YOUR_SUPABASE_PROJECT_URL` y `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`.

## 2. Crear el acceso de administrador

1. En Supabase, abre **Authentication → Users** y crea un usuario con el correo y contraseña del administrador. No actives el registro público de usuarios.
2. Copia el UUID del usuario recién creado.
3. En **SQL Editor**, ejecuta esto con el UUID real:

   ```sql
   insert into public.admin_users (user_id)
   values ('PEGA-AQUI-EL-UUID-DEL-USUARIO');
   ```

Solo las cuentas incluidas en `admin_users` podrán guardar productos o subir y borrar fotos. Si alguien crea una cuenta fuera de esa lista, no tendrá permisos para administrar el catálogo.

## 3. Abrir y publicar

- Entra a `admin.html` para iniciar sesión, subir fotos, editar nombres, descripciones, precios y etiquetas, ocultar o mostrar productos, y eliminar arreglos.
- Sirve la carpeta desde un servidor web o súbela a tu hosting. Para iniciar sesión y cargar el proyecto remoto, no abras los archivos con `file://`.
- La tienda pública carga los productos visibles desde Supabase. Los botones de pedido siguen usando WhatsApp; cambia el número de ejemplo en `script.js` antes de publicar.

## Archivos de conexión

- `supabase-config.js`: URL y clave pública del proyecto.
- `supabase-setup.sql`: esquema inicial, producto de muestra y políticas de acceso.
- `admin.html`: entrada privada del administrador.
- `admin.js`: acceso, edición del catálogo y carga de imágenes.

La clave pública puede estar en el navegador porque las políticas RLS protegen los datos; nunca pegues una clave secreta o de servicio en `supabase-config.js`.
