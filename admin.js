const config = window.SUPABASE_CONFIG;
const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#login-form");
const loginNotice = document.querySelector("#login-notice");
const form = document.querySelector("#product-form");
const formNotice = document.querySelector("#form-notice");
const globalNotice = document.querySelector("#global-notice");
const productList = document.querySelector("#product-list");
let client = null;
let currentUser = null;
let productsById = new Map();

function setMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle("success", success);
}

function readyConfig() {
  return window.supabase && config?.url && config?.anonKey &&
    !config.url.includes("YOUR_") && !config.anonKey.includes("YOUR_");
}

function setSignedIn(isAdmin) {
  loginPanel.hidden = isAdmin;
  dashboard.hidden = !isAdmin;
}

async function confirmAdmin(user) {
  currentUser = user;
  if (!user) {
    setSignedIn(false);
    return false;
  }
  const { data, error } = await client.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error || !data) {
    await client.auth.signOut();
    currentUser = null;
    setSignedIn(false);
    setMessage(loginNotice, "Esta cuenta no tiene permisos de administrador.");
    return false;
  }
  setSignedIn(true);
  await loadProducts();
  await loadVisitorStats(); // <--- CARGA LAS ESTADÍSTICAS AL ENTRAR
  return true;
}

async function loadProducts() {
  productList.replaceChildren(Object.assign(document.createElement("p"), { className: "loading-row", textContent: "Cargando arreglos…" }));
  const { data, error } = await client.from("products").select("*").order("sort_order").order("name");
  if (error) {
    productList.replaceChildren();
    setMessage(globalNotice, `No se pudo cargar el catálogo: ${error.message}`);
    return;
  }
  productsById = new Map(data.map((product) => [product.id, product]));
  document.querySelector("#product-count").textContent = `${data.length} en total`;
  productList.replaceChildren(...data.map(makeAdminProduct));
}

// NUEVA FUNCIÓN: Cargar las estadísticas de visitas por día desde Supabase
async function loadVisitorStats() {
  const statsContainer = document.getElementById('stats-container');
  if (!statsContainer) return;

  statsContainer.innerHTML = '<p>Cargando estadísticas...</p>';

  const { data, error } = await client
    .from('page_views')
    .select('date')
    .order('date', { ascending: false });

  if (error) {
    statsContainer.innerHTML = '<p>Error al cargar las estadísticas.</p>';
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    statsContainer.innerHTML = '<p>Aún no hay visitas registradas.</p>';
    return;
  }

  // Agrupar visitas por fecha
  const countsByDate = data.reduce((acc, row) => {
    acc[row.date] = (acc[row.date] || 0) + 1;
    return acc;
  }, {});

  // Construir la tabla de estadísticas
  let html = `
    <table style="width:100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9rem;">
      <thead>
        <tr style="border-bottom: 2px solid #eee; text-align: left;">
          <th style="padding: 10px;">Fecha</th>
          <th style="padding: 10px;">Usuarios / Visitas</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const [date, count] of Object.entries(countsByDate)) {
    html += `
      <tr style="border-bottom: 1px solid #f0f0f0;">
        <td style="padding: 10px;">${date}</td>
        <td style="padding: 10px; font-weight: bold; color: var(--rose, #bd746e);">${count}</td>
      </tr>
    `;
  }

  html += `</tbody></table>`;
  statsContainer.innerHTML = html;
}

function makeAdminProduct(product) {
  const row = document.createElement("article");
  row.className = "admin-product";
  const image = document.createElement("img");
  image.src = /^https:\/\//i.test(product.image_url || "") ? product.image_url : "";
  image.alt = "";
  const details = document.createElement("div");
  const name = document.createElement("h3");
  name.textContent = product.name;
  const description = document.createElement("p");
  description.textContent = `S/ ${Number(product.price).toFixed(2)} · ${product.description}`;
  const status = document.createElement("span");
  status.className = `status${product.active ? "" : " off"}`;
  status.textContent = product.active ? "Visible en la tienda" : "Oculto en la tienda";
  details.append(name, description, status);

  const actions = document.createElement("div");
  actions.className = "product-actions";
  const edit = makeAction("Editar", () => beginEdit(product.id));
  const toggle = makeAction(product.active ? "Ocultar" : "Mostrar", () => toggleProduct(product));
  const remove = makeAction("Eliminar", () => deleteProduct(product));
  remove.classList.add("delete-button");
  actions.append(edit, toggle, remove);
  row.append(image, details, actions);
  return row;
}

function makeAction(label, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", handler);
  return button;
}

function beginEdit(id) {
  const product = productsById.get(id);
  if (!product) return;
  form.elements.namedItem("id").value = product.id;
  form.elements.namedItem("old_image_path").value = product.image_path || "";
  form.elements.namedItem("name").value = product.name;
  form.elements.namedItem("description").value = product.description;
  form.elements.namedItem("price").value = product.price;
  form.elements.namedItem("badge").value = product.badge || "";
  form.elements.namedItem("image").value = "";
  form.elements.namedItem("image_url").value = product.image_url || "";
  form.elements.namedItem("active").checked = product.active;
  document.querySelector("#form-title").textContent = "Editar arreglo";
  document.querySelector("#save-button").innerHTML = "Guardar cambios <span>↗</span>";
  document.querySelector("#cancel-edit").hidden = false;
  setMessage(formNotice, "Editando: " + product.name, true);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetEditor() {
  form.reset();
  form.elements.namedItem("id").value = "";
  form.elements.namedItem("old_image_path").value = "";
  document.querySelector("#form-title").textContent = "Agregar arreglo";
  document.querySelector("#save-button").innerHTML = "Guardar arreglo <span>↗</span>";
  document.querySelector("#cancel-edit").hidden = true;
  setMessage(formNotice, "");
}

async function uploadImage(file) {
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" })[file.type];
  if (!extension) throw new Error("Elige una imagen JPG, PNG o WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La imagen debe pesar menos de 5 MB.");
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from("product-images").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = client.storage.from("product-images").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return;
  const saveButton = document.querySelector("#save-button");
  saveButton.disabled = true;
  setMessage(formNotice, "Guardando…", true);
  let newImagePath = "";
  try {
    const values = new FormData(form);
    const id = String(values.get("id") || "");
    const oldPath = String(values.get("old_image_path") || "");
    const existingProduct = id ? productsById.get(id) : null;
    const file = values.get("image");
    let imageUrl = String(values.get("image_url") || "").trim();
    let imagePath = oldPath;
    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadImage(file);
      newImagePath = uploaded.path;
      imageUrl = uploaded.url;
      imagePath = uploaded.path;
    } else if (!imageUrl && id) {
      imageUrl = existingProduct?.image_url || "";
    }
    if (id && imageUrl !== existingProduct?.image_url && !newImagePath) imagePath = "";
    if (!imageUrl) throw new Error("Sube una foto o pega una URL de imagen antes de guardar.");
    if (!/^https:\/\//i.test(imageUrl)) throw new Error("La URL de la imagen debe comenzar con https://.");

    const payload = {
      name: String(values.get("name")).trim(),
      description: String(values.get("description")).trim(),
      price: Number(values.get("price")),
      badge: String(values.get("badge") || "").trim(),
      image_url: imageUrl,
      image_path: imagePath,
      active: form.elements.namedItem("active").checked,
      updated_at: new Date().toISOString(),
    };
    const result = id
      ? await client.from("products").update(payload).eq("id", id)
      : await client.from("products").insert(payload);
    if (result.error) throw result.error;
    if (id && oldPath && newImagePath && oldPath !== newImagePath) {
      await client.storage.from("product-images").remove([oldPath]);
    }
    resetEditor();
    setMessage(globalNotice, "El arreglo se guardó correctamente.", true);
    await loadProducts();
  } catch (error) {
    if (newImagePath) await client.storage.from("product-images").remove([newImagePath]);
    setMessage(formNotice, error.message || "No se pudo guardar el arreglo.");
  } finally {
    saveButton.disabled = false;
  }
});

async function toggleProduct(product) {
  const { error } = await client.from("products").update({ active: !product.active, updated_at: new Date().toISOString() }).eq("id", product.id);
  if (error) setMessage(globalNotice, `No se pudo actualizar: ${error.message}`);
  else {
    setMessage(globalNotice, product.active ? "El arreglo quedó oculto." : "El arreglo ya aparece en la tienda.", true);
    await loadProducts();
  }
}

async function deleteProduct(product) {
  if (!window.confirm(`¿Eliminar «${product.name}» del catálogo?`)) return;
  const { error } = await client.from("products").delete().eq("id", product.id);
  if (error) {
    setMessage(globalNotice, `No se pudo eliminar: ${error.message}`);
    return;
  }
  if (product.image_path) await client.storage.from("product-images").remove([product.image_path]);
  setMessage(globalNotice, "El arreglo se eliminó.", true);
  await loadProducts();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) return;
  const button = loginForm.querySelector("button");
  button.disabled = true;
  setMessage(loginNotice, "Verificando acceso…", true);
  const values = new FormData(loginForm);
  const { data, error } = await client.auth.signInWithPassword({ email: values.get("email"), password: values.get("password") });
  if (error) {
    setMessage(loginNotice, "No se pudo iniciar sesión. Revisa el correo y la contraseña.");
  } else if (!(await confirmAdmin(data.user))) {
    // confirmAdmin muestra el aviso y cierra la sesión de cuentas sin permiso.
  } else {
    loginForm.reset();
    setMessage(loginNotice, "");
  }
  button.disabled = false;
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  await client.auth.signOut();
  currentUser = null;
  setSignedIn(false);
  resetEditor();
  setMessage(loginNotice, "Sesión cerrada.", true);
});

document.querySelector("#cancel-edit").addEventListener("click", resetEditor);

if (!readyConfig()) {
  setMessage(loginNotice, "Falta conectar Supabase. Sigue los pasos de CONFIGURAR.md.");
} else {
  client = window.supabase.createClient(config.url, config.anonKey);
  client.auth.getSession().then(({ data, error }) => {
    if (error) setMessage(loginNotice, "No se pudo revisar la sesión. Comprueba la configuración de Supabase.");
    else if (data.session?.user) confirmAdmin(data.session.user);
  });
}