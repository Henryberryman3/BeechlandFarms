const STORAGE_KEY = "beechland-farms-data";
const pageContent = document.getElementById("page-content");
const navHome = document.getElementById("nav-home");
const navFarms = document.getElementById("nav-farms");

let state = {
  view: "home",
  farmId: null,
  data: { farms: [] },
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      state.data = JSON.parse(saved);
    } catch (err) {
      console.error("Could not parse saved data", err);
    }
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function setView(view, farmId = null) {
  state.view = view;
  state.farmId = farmId;
  render();
}

function getCurrentFarm() {
  return state.data.farms.find((farm) => farm.id === state.farmId) || null;
}

function updateActiveNav() {
  navHome.classList.toggle("active", state.view === "home");
  navFarms.classList.toggle("active", state.view === "farms");
}

function render() {
  updateActiveNav();

  if (state.view === "home") {
    renderHome();
  } else if (state.view === "farms") {
    renderFarms();
  } else if (state.view === "fields") {
    renderFields();
  }
}

function renderHome() {
  pageContent.innerHTML = `
    <section>
      <h1 class="section-title">Welcome to Beechland Farms</h1>
      <p class="description">Manage your farms, add fields, and upload images in one simple app. The interface keeps everything clean and easy to use.</p>
      <button id="home-action" class="primary">Go to farms</button>
    </section>
  `;

  document.getElementById("home-action").addEventListener("click", () => setView("farms"));
}

function renderFarms() {
  const farms = state.data.farms;
  const farmsHtml = farms.length
    ? farms
        .map(
          (farm) => `
          <div class="card" data-id="${farm.id}">
            <h2 class="card-title">${farm.name}</h2>
            <p class="card-subtitle">${farm.fields.length} fields · ${farm.images?.length || 0} images</p>
          </div>`
        )
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

  document.getElementById("add-farm").addEventListener("click", () => {
    const field = document.getElementById("farm-name");
    const name = field.value.trim();
    if (!name) return;

    state.data.farms.push({
      id: `farm-${Date.now()}`,
      name,
      fields: [],
      images: [],
    });

    field.value = "";
    saveState();
    renderFarms();
  });

  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => {
      setView("fields", card.dataset.id);
    });
  });
}

function renderFields() {
  const farm = getCurrentFarm();
  if (!farm) {
    setView("farms");
    return;
  }

  const fieldsHtml = farm.fields.length
    ? farm.fields
        .map(
          (field) => `
          <div class="field-item">
            <div class="field-header">
              <div>
                <strong>${field.name}</strong>
                <p class="field-meta">Crop: ${field.crop}</p>
              </div>
              <span class="field-meta">${field.images.length} image${field.images.length === 1 ? "" : "s"}</span>
            </div>
            <div class="field-upload">
              <input id="image-upload-${field.id}" type="file" accept="image/*" multiple />
              <button data-field-id="${field.id}" class="primary upload-field-images">Upload images</button>
            </div>
            <div class="field-gallery" id="gallery-${field.id}">
              ${field.images.length
                ? field.images
                    .map((src) => `<img src="${src}" alt="Field image" />`)
                    .join("")
                : `<p class="description small-note">No images yet for this field.</p>`}
            </div>
          </div>`
        )
        .join("")
    : `<p class="description">No fields yet. Add one to organize your farm.</p>`;

  pageContent.innerHTML = `
    <section>
      <a href="#" id="back-button" class="back-link">← Back to farms</a>
      <h1 class="section-title">${farm.name}</h1>
      <p class="description">Add fields below and upload images that belong to each field.</p>

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

  document.getElementById("add-field").addEventListener("click", () => {
    const nameInput = document.getElementById("field-name");
    const cropInput = document.getElementById("field-crop");
    const name = nameInput.value.trim();
    const crop = cropInput.value.trim();
    if (!name || !crop) return;

    farm.fields.push({ id: `field-${Date.now()}`, name, crop, images: [] });
    nameInput.value = "";
    cropInput.value = "";
    saveState();
    renderFields();
  });

  document.querySelectorAll(".upload-field-images").forEach((button) => {
    button.addEventListener("click", async () => {
      const fieldId = button.dataset.fieldId;
      const field = farm.fields.find((item) => item.id === fieldId);
      if (!field) return;

      const input = document.getElementById(`image-upload-${fieldId}`);
      const files = Array.from(input.files || []);
      if (!files.length) return;

      const promises = files.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      });

      const images = await Promise.all(promises);
      field.images.push(...images);
      input.value = "";
      saveState();
      renderFields();
    });
  });

  document.querySelectorAll(".field-gallery img").forEach((img) => {
    img.addEventListener("click", () => {
      openImagePreview(img.src);
    });
  });
}

function openImagePreview(src) {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("image-modal-img");
  modalImg.src = src;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeImagePreview() {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("image-modal-img");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modalImg.src = "";
}

const modalBackdrop = document.getElementById("image-modal-backdrop");
const modalClose = document.getElementById("image-modal-close");
modalBackdrop.addEventListener("click", closeImagePreview);
modalClose.addEventListener("click", closeImagePreview);

navHome.addEventListener("click", () => setView("home"));
navFarms.addEventListener("click", () => setView("farms"));

loadState();
render();
