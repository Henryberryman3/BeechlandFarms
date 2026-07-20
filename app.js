const SUPABASE_URL = "https://tvwjsyidqxmjsljfxyqd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XaDMM-l1bav5ncZ5OccF8w_lY-L1UCT";
const STORAGE_BUCKET = "field-images";

const pageContent = document.getElementById("page-content");
const navHome = document.getElementById("nav-home");
const navFarms = document.getElementById("nav-farms");
const imageModal = document.getElementById("image-modal");
const imageModalImg = document.getElementById("image-modal-img");
const imageModalBackdrop = document.getElementById("image-modal-backdrop");
const imageModalClose = document.getElementById("image-modal-close");

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let state = {
  view: "home",
  farmId: null,
  farms: [],
  farmMeta: { fieldCounts: {}, imageCounts: {} },
};

function hasSupabaseConfig() {
  return !SUPABASE_URL.includes("YOUR-SUPABASE") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");
}

function updateActiveNav() {
  navHome.classList.toggle("active", state.view === "home");
  navFarms.classList.toggle("active", state.view === "farms");
}

function showMessage(message) {
  pageContent.innerHTML = `
    <section>
      <h1 class="section-title">Beechland Farms</h1>
      <p class="description">${message}</p>
    </section>
  `;
}

async function render() {
  updateActiveNav();

  if (!hasSupabaseConfig()) {
    renderMissingConfig();
    return;
  }

  if (state.view === "home") {
    renderHome();
  } else if (state.view === "farms") {
    await renderFarms();
  } else if (state.view === "fields") {
    await renderFields();
  }
}

function renderMissingConfig() {
  showMessage("Set SUPABASE_URL and SUPABASE_ANON_KEY in app.js, then open the app again.");
}

function getHashState() {
  const hash = location.hash.slice(1);
  if (hash === "home") return { view: "home" };
  if (hash === "farms") return { view: "farms" };
  if (hash.startsWith("farm=")) return { view: "fields", farmId: hash.split("=")[1] };
  return null;
}

function updateHash() {
  if (state.view === "fields" && state.farmId) {
    location.hash = `farm=${state.farmId}`;
  } else if (state.view === "farms") {
    location.hash = "farms";
  } else {
    location.hash = "home";
  }
}

async function loadInitialState() {
  const hashState = getHashState();
  if (hashState) {
    state.view = hashState.view;
    state.farmId = hashState.farmId || null;
    await render();
    return;
  }

  await render();
}

function renderHome() {
  pageContent.innerHTML = `
    <section>
      <h1 class="section-title">Welcome to Beechland Farms</h1>
      <p class="description">Manage your farms, add fields, and upload images in one shared Supabase backend.</p>
      <button id="home-action" class="primary">Go to farms</button>
    </section>
  `;

  document.getElementById("home-action").addEventListener("click", () => setView("farms"));
}

async function getImageUrl(path) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24); // valid for 24 hours

  if (!error && data && data.signedUrl) {
    return data.signedUrl;
  }

  const publicResponse = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return publicResponse.data?.publicUrl || "";
}

async function loadFarmData() {
  const [farmRes, fieldRes, imageRes] = await Promise.all([
    supabase.from("farms").select("id,name").order("created_at", { ascending: true }),
    supabase.from("fields").select("id,farm_id").order("created_at", { ascending: true }),
    supabase.from("field_images").select("id,farm_id").order("created_at", { ascending: true }),
  ]);

  if (farmRes.error) {
    showMessage(`Unable to load farms: ${farmRes.error.message}`);
    return false;
  }

  const fieldCounts = {};
  const imageCounts = {};

  (fieldRes.data || []).forEach((field) => {
    fieldCounts[field.farm_id] = (fieldCounts[field.farm_id] || 0) + 1;
  });

  (imageRes.data || []).forEach((image) => {
    imageCounts[image.farm_id] = (imageCounts[image.farm_id] || 0) + 1;
  });

  state.farms = farmRes.data || [];
  state.farmMeta = { fieldCounts, imageCounts };

  return true;
}

async function renderFarms() {
  const loaded = await loadFarmData();
  if (!loaded) return;

  const farmsHtml = state.farms.length
    ? state.farms
        .map((farm) => {
          const fieldCount = state.farmMeta.fieldCounts[farm.id] || 0;
          const imageCount = state.farmMeta.imageCounts[farm.id] || 0;
          return `
            <div class="card" data-id="${farm.id}">
              <h2 class="card-title">${farm.name}</h2>
              <p class="card-subtitle">${fieldCount} fields · ${imageCount} images</p>
            </div>`;
        })
        .join("")
    : `<p class="description">No farms yet. Add your first farm to get started.</p>`;

  pageContent.innerHTML = `
    <section>
      <div class="section-header">
        <h1 class="section-title">Farms</h1>
      </div>
      <div class="form-row">
        <input id="farm-name" type="text" placeholder="Add a farm name" />
        <button id="add-farm" class="primary">Add farm</button>
      </div>
      <div class="card-grid">${farmsHtml}</div>
    </section>
  `;

  document.getElementById("add-farm").addEventListener("click", async () => {
    const field = document.getElementById("farm-name");
    const name = field.value.trim();
    if (!name) return;

    const { error } = await supabase.from("farms").insert([{ name }]);
    if (error) {
      showMessage(`Unable to add farm: ${error.message}`);
      return;
    }

    field.value = "";
    await renderFarms();
  });

  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      setView("fields", card.dataset.id);
    });
  });
}

async function loadFarmDetails(farmId) {
  const [farmRes, fieldsRes, imagesRes] = await Promise.all([
    supabase.from("farms").select("id,name").eq("id", farmId).single(),
    supabase.from("fields").select("id,name,crop").eq("farm_id", farmId).order("created_at", { ascending: true }),
    supabase.from("field_images").select("id,field_id,storage_path").eq("farm_id", farmId).order("created_at", { ascending: true }),
  ]);

  if (farmRes.error || fieldsRes.error || imagesRes.error) {
    return null;
  }

  const imagesByField = {};
  (imagesRes.data || []).forEach((image) => {
    imagesByField[image.field_id] = imagesByField[image.field_id] || [];
    imagesByField[image.field_id].push(image.storage_path);
  });

  return {
    id: farmRes.data.id,
    name: farmRes.data.name,
    fields: fieldsRes.data || [],
    imagesByField,
  };
}

async function renderFields() {
  const farm = await loadFarmDetails(state.farmId);
  if (!farm) {
    setView("farms");
    return;
  }

  const fieldsHtml = farm.fields.length
    ? await Promise.all(
        farm.fields.map(async (field) => {
          const fieldImages = farm.imagesByField[field.id] || [];
          const galleryHtml = fieldImages.length
            ? (
                await Promise.all(
                  fieldImages.map(async (path) => {
                    const imageUrl = await getImageUrl(path);
                    return `<img src="${imageUrl}" alt="Field image" data-path="${path}" />`;
                  })
                )
              ).join("")
            : `<p class="description small-note">No images yet for this field.</p>`;

          return `
            <div class="field-item">
              <div class="field-header">
                <div>
                  <strong>${field.name}</strong>
                  <p class="field-meta">Crop: ${field.crop}</p>
                </div>
                <span class="field-meta">${fieldImages.length} image${fieldImages.length === 1 ? "" : "s"}</span>
              </div>
              <div class="field-upload">
                <input id="image-upload-${field.id}" type="file" accept="image/*" multiple />
                <button data-field-id="${field.id}" class="primary upload-field-images">Upload images</button>
              </div>
              <div class="field-gallery" id="gallery-${field.id}">${galleryHtml}</div>
            </div>`;
        })
        .join("")
    : `<p class="description">No fields yet. Add one to organize your farm.</p>`;

  const baseUrl = window.location.href.split("#")[0];
  const shareUrl = `${baseUrl}#farm=${farm.id}`;

  pageContent.innerHTML = `
    <section>
      <div class="section-header">
        <a href="#" id="back-button" class="back-link">← Back to farms</a>
        <button id="copy-share-link" class="secondary">Copy share link</button>
      </div>
      <h1 class="section-title">${farm.name}</h1>
      <p class="description">This page shows field details for the selected farm and lets you upload images for each field.</p>
      <p class="description small-note">Share this page with others to let them view the same farm and its uploaded images.</p>

      <div class="form-row">
        <input id="field-name" type="text" placeholder="Field name" />
        <input id="field-crop" type="text" placeholder="Crop type" />
        <button id="add-field" class="primary">Add field</button>
      </div>

      <div class="field-list">${fieldsHtml}</div>
    </section>
  `;

  document.getElementById("back-button").addEventListener("click", (event) => {
    event.preventDefault();
    setView("farms");
  });

  const copyShareLinkButton = document.getElementById("copy-share-link");
  if (copyShareLinkButton) {
    copyShareLinkButton.addEventListener("click", async () => {
      const baseUrl = window.location.href.split("#")[0];
      const url = `${baseUrl}#farm=${farm.id}`;
      try {
        await navigator.clipboard.writeText(url);
        copyShareLinkButton.textContent = "Copied!";
        setTimeout(() => {
          copyShareLinkButton.textContent = "Copy share link";
        }, 1500);
      } catch (error) {
        alert(`Copy this link to share: ${url}`);
      }
    });
  }

  document.getElementById("add-field").addEventListener("click", async () => {
    const nameInput = document.getElementById("field-name");
    const cropInput = document.getElementById("field-crop");
    const name = nameInput.value.trim();
    const crop = cropInput.value.trim();
    if (!name || !crop) return;

    const { error } = await supabase.from("fields").insert([{ farm_id: farm.id, name, crop }]);
    if (error) {
      showMessage(`Unable to add field: ${error.message}`);
      return;
    }

    nameInput.value = "";
    cropInput.value = "";
    await renderFields();
  });

  document.querySelectorAll(".upload-field-images").forEach((button) => {
    button.addEventListener("click", async () => {
      const fieldId = button.dataset.fieldId;
      const input = document.getElementById(`image-upload-${fieldId}`);
      const files = Array.from(input.files || []);
      if (!files.length) return;

      await Promise.all(
        files.map(async (file) => {
          const filePath = `${farm.id}/${fieldId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, { cacheControl: "3600", upsert: false });

          if (uploadError) {
            showMessage(`Unable to upload image: ${uploadError.message}`);
            return;
          }

          await supabase.from("field_images").insert([
            { farm_id: farm.id, field_id: fieldId, storage_path: filePath },
          ]);
        })
      );

      input.value = "";
      await renderFields();
    });
  });

  document.querySelectorAll(".field-gallery img").forEach((img) => {
    img.addEventListener("click", () => {
      openImagePreview(img.src);
    });
  });
}

function openImagePreview(src) {
  imageModalImg.src = src;
  imageModal.classList.add("open");
  imageModal.setAttribute("aria-hidden", "false");
}

function closeImagePreview() {
  imageModal.classList.remove("open");
  imageModal.setAttribute("aria-hidden", "true");
  imageModalImg.src = "";
}

imageModalBackdrop.addEventListener("click", closeImagePreview);
imageModalClose.addEventListener("click", closeImagePreview);
navHome.addEventListener("click", () => setView("home"));
navFarms.addEventListener("click", () => setView("farms"));

async function setView(view, farmId = null) {
  state.view = view;
  state.farmId = farmId;
  updateHash();
  await render();
}

window.addEventListener("hashchange", async () => {
  const hashState = getHashState();
  if (hashState) {
    state.view = hashState.view;
    state.farmId = hashState.farmId || null;
    await render();
  }
});

loadInitialState();
