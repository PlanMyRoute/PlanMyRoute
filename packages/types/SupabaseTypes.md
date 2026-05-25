# Importar typos de la base de datos (Supabase) a typescript:

Escribir por terminal dentro del proyecto de shared: npx supabase gen types typescript --project-id "mqdqzygwhmrmkvuprsqp" --schema public > supabase.ts

Ejecutar el sript que actualiza los tipos que van a ser publicados: npm run build

