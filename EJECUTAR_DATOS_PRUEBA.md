# 🚀 Ejecutar Datos de Prueba en Supabase

## 📋 Instrucciones

Para que la aplicación muestre datos reales en lugar de estar en blanco, necesitas ejecutar los datos de prueba en Supabase.

### 🔧 Pasos a Seguir:

#### 1. **Abrir Supabase Dashboard**
- Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Inicia sesión en tu cuenta
- Selecciona tu proyecto

#### 2. **Abrir SQL Editor**
- En el menú lateral, haz clic en **"SQL Editor"**
- Haz clic en **"New query"**

#### 3. **Ejecutar Datos de Prueba**
- Copia **TODO** el contenido del archivo `supabase-seed-data.sql`
- Pégalo en el editor SQL
- Haz clic en **"Run"** (botón verde)

#### 4. **Verificar Resultado**
Deberías ver un mensaje como:
```
✅ Datos de prueba insertados exitosamente
📊 Clientes creados: 8 (5 para Org 1, 3 para Org 2)
📄 Facturas creadas: 5 (3 para Org 1, 2 para Org 2)
💰 Total facturado Org 1: Bs. 410,000.00
💰 Total facturado Org 2: Bs. 120,000.00
```

### 🎯 ¿Qué se Crea?

#### **Clientes (8 total):**
- **5 clientes** para la primera organización
- **3 clientes** para la segunda organización

#### **Facturas (5 total):**
- **3 facturas** para la primera organización
- **2 facturas** para la segunda organización

### 🔑 Credenciales de Prueba

Después de ejecutar los datos, puedes usar estas credenciales:

#### **Organización 1 (TECNOLOGÍA AVANZADA VENEZOLANA C.A.):**
- **admin** / **admin123**
- **contador** / **contador123**

#### **Organización 2 (CONSULTORÍA EMPRESARIAL DEL CARIBE C.A.):**
- **auditor** / **auditor123**
- **facturador** / **facturador123**

### 📊 Lo que Verás Después:

1. **Dashboard**: Estadísticas reales (clientes, facturas, ingresos)
2. **Clientes**: Lista de clientes reales de tu organización
3. **Facturas**: Lista de facturas reales de tu organización
4. **Aislamiento**: Cada organización solo ve sus propios datos

### ⚠️ Importante:

- **Ejecuta SOLO una vez** los datos de prueba
- Si los ejecutas varias veces, obtendrás errores de duplicados
- Los datos se crean para las organizaciones ya existentes en el schema

### 🚨 Si Hay Errores:

Si obtienes errores al ejecutar, verifica que:
1. Ya ejecutaste el `supabase-schema.sql` anteriormente
2. Las organizaciones existen en la base de datos
3. Los usuarios existen en la base de datos

### 🎉 ¡Listo!

Una vez ejecutados los datos de prueba, la aplicación debería mostrar información real en lugar de estar en blanco.
