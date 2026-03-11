# Importar typos de la base de datos (Supabase) a typescript:

Escribir por terminal dentro del proyecto de shared: npx supabase gen types typescript --project-id "mqdqzygwhmrmkvuprsqp" --schema public > types/supabase.ts

Ejecutar el sript que actualiza los tipos que van a ser publicados: npm run build

# Subir cambios:
Guardamos los cambios en el git
1. git add .
2. git commit -m "..."

Actulizamos la versión
3. npm version [major | minor | patch] 
    -Major actualiza el primer dijito +1.x.x
    -minor actualiza el segundo dijito x.+1.x
    -patch actualiza el último dijito x.x.+1

Subimos los cambios a github
4. git push && git push --tags

Publicamos el paquete
5. npm publish
