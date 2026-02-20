# Flujo sencillo: de "pulumi up" a recursos en la nube

---

## En una frase

Tú dices **qué** quieres (lista de recursos) y **en qué nube** (AWS, Azure, GCP). Un motor se encarga de **crear cada recurso** en orden y de **conectar** los que dependen de otros (por ejemplo: la base de datos usa las subnets de la red).

---

## Paso a paso (sin tecnicismos)

### 1. Tú configuras y ejecutas

- En la terminal: `pulumi config set cloud:provider aws` y `pulumi config set cloud:region us-east-1`.
- Luego: `pulumi up` en `src/packages/backend-infra` (o frontend-infra).

Eso lee la **config** (provider, región, etc.) y ejecuta el **index.ts** del proyecto.

---

### 2. El index hace dos cosas

**A) Arma la lista de recursos**

- Llama a `getBackendResources(stackName, config)`.
- Esa función devuelve una **lista** de “recetas”: “crear red”, “crear load balancer”, “crear base de datos”, etc.
- Cada “receta” tiene un **tipo** (network, database, …), un **nombre** y sus **datos** (CIDR, tamaño, etc.).
- Donde un recurso necesita algo de otro (por ejemplo la DB necesita las subnets de la red), se pone una **referencia**: “usa lo que salió de `network.privateSubnetIds`”.

**B) Le pasa todo al motor**

- Llama a `createResources(provider, listaDeRecursos, baseContext)`.
- Le dice: “con provider AWS, crea estos recursos; además usa esta región y estos tags para todos”.

---

### 3. El motor (createResources) hace el trabajo

- Recibe la **lista de recursos** y un **contexto** vacío donde irá guardando las salidas.
- **Recorre la lista en orden**, uno por uno:

  Para cada recurso:

  1. **Resuelve referencias**  
     Si la “receta” dice “subnetIds: { ref: 'network.privateSubnetIds' }”, mira en el contexto qué hay en `network.privateSubnetIds` (porque la red ya se creó antes) y usa eso en lugar del `ref`.

  2. **Le suma a la receta** lo común: provider, region, tags (eso es el baseContext).

  3. **Elige el “creador” correcto** según el tipo (network → adapter de red, database → adapter de base de datos, etc.).

  4. **Llama a ese creador** con la receta ya resuelta (sin refs, con valores reales).

  5. **Guarda lo que devuelve** el creador en el contexto bajo una clave (por ejemplo `"network"` o `"database"`), para que los recursos que vienen después puedan referenciarlo con `ref`.

- Al final, el **contexto** tiene todas las salidas (vpcId, endpoint de la DB, URL del load balancer, etc.).

---

### 4. Quién crea cada tipo de recurso (adapters)

- El motor no sabe crear una VPC ni una RDS; solo sabe “para tipo X, llamar al adapter X”.
- Los **adapters** sí saben: cada uno conoce la API de un cloud (AWS, Azure, GCP).
- Por eso:
  - Si elegiste **AWS**, el motor usa los adapters de AWS: “crear red” → crea VPC y subnets en AWS; “crear base de datos” → crea RDS en AWS.
  - Si en el futuro eliges **Azure**, los mismos “tipos” (network, database, …) serán creados por los adapters de Azure (VNet, Azure SQL, etc.).

El **contrato** (qué recibe y qué devuelve cada adapter) está definido en **shared**; la **implementación** (código que llama a AWS/Azure/GCP) está en **provider-factory** (por ejemplo `aws/database.ts`).

---

### 5. De vuelta al index

- El index recibe el **contexto** que devolvió el motor.
- De ahí saca lo que quiere exportar: `ctx.network`, `ctx.database`, etc., y hace **export** de cosas como `databaseEndpoint`, `loadBalancerUrl`, etc.
- Eso es lo que ves con `pulumi stack output` y lo que puede usar otro código o otro stack.

---

## Dudas frecuentes

### “¿Dónde se define que la DB sea RDS?”

En el **adapter de base de datos de AWS** (`provider-factory/src/aws/database.ts`). Ahí está el código que crea `aws.rds.Instance` (RDS). El index y el motor solo piden “crear recurso tipo database”; quien decide que sea RDS es ese adapter cuando el provider es AWS.

---

### “¿Qué es el descriptor?”

Es **una receta** para un recurso: tipo (network, database, …), nombre, y datos (o referencias a otros recursos). La lista que arma `getBackendResources` es un array de descriptores. El motor lee cada descriptor, resuelve las refs, y se lo pasa al adapter que toque.

---

### “¿Qué es el context?”

Un **diccionario** que el motor va llenando: después de crear la red, guarda sus salidas en `context["network"]`; después de crear la DB, en `context["database"]`, etc. Así, cuando un descriptor dice `{ ref: "network.privateSubnetIds" }`, el motor busca `context["network"].privateSubnetIds` y usa ese valor (que es una salida de Pulumi, por ejemplo un `Output<string[]>`).

---

### “¿Por qué el orden de la lista importa?”

Porque las **referencias** solo pueden apuntar a recursos **ya creados**. Si la base de datos tiene `subnetIds: { ref: "network.privateSubnetIds" }`, la red tiene que estar antes en la lista para que, cuando toque crear la DB, `context["network"]` ya exista.

---

### “¿Qué es baseContext?”

Lo **común** a todos los recursos: provider (aws/azure/gcp), region, tags. El motor lo fusiona con cada descriptor antes de llamar al adapter, para no repetir eso en cada “receta”.

---

### “¿Shared toca AWS o Azure?”

No. **Shared** solo define **tipos e interfaces** (qué datos recibe y qué devuelve cada componente). No importa `@pulumi/aws` ni ningún SDK de nube. Quien toca AWS/Azure/GCP es **provider-factory** (los adapters).

---

## Dibujo muy simple

```
Tú
  → config (provider, region, …)
  → pulumi up

index.ts
  → Lee config
  → getBackendResources()  →  lista de descriptores (recetas)
  → createResources(provider, lista, baseContext)

createResources (motor)
  → Para cada descriptor en la lista:
      1. Resolver refs con el context
      2. Llamar al adapter que corresponda (network, database, …)
      3. Guardar salidas en context
  → Devolver context

index.ts
  → Toma ctx.network, ctx.database, …
  → Exporta outputs (databaseEndpoint, loadBalancerUrl, …)
```

Si quieres, en el siguiente mensaje podemos bajar a **un solo recurso** (por ejemplo solo la base de datos) y seguirlo de punta a punta con los nombres de archivos y funciones concretos.
