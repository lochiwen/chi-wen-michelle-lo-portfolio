const links = [...document.querySelectorAll(".nav-links a")];
const sections = links
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);
const editToggle = document.querySelector("[data-edit-toggle]");
const editReset = document.querySelector("[data-edit-reset]");
const editStatus = document.querySelector("[data-edit-status]");
const editableSelectors = [
  ".brand strong",
  ".brand small",
  "main h1",
  "main h2",
  "main h3",
  "main p",
  "main time",
  ".project-meta span",
  ".tag-list li",
  ".case-study li",
  ".case-study dt",
  ".case-study dd",
  ".capability-list span",
  ".site-footer span",
];
const editableItems = [...document.querySelectorAll(editableSelectors.join(","))];
const linkedCards = [...document.querySelectorAll("[data-card-link]")];
const storagePrefix = `michelle-portfolio:${window.location.pathname}:`;
const legacyStoragePrefix = storagePrefix;
const profileCropPreview = document.querySelector("[data-profile-crop-preview]");
const profileCropInputs = [...document.querySelectorAll("[data-profile-crop-input]")];
const profileCropKey = `${storagePrefix}profile-crop-outpainted-v1`;
const defaultProfileCrop = { zoom: 1, x: 0, y: -88 };
let editing = false;

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  },
  { rootMargin: "-42% 0px -50% 0px", threshold: 0 }
);

sections.forEach((section) => observer.observe(section));

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function getContainerLabel(item) {
  const container = item.closest(".project-card, .case-panel, .fit-item, .timeline-item, .case-study-hero, .contact-section, .site-footer, section");
  if (!container) return "page";

  const heading = container.querySelector("h1, h2, h3");
  if (heading) return slugify(heading.textContent);
  if (container.id) return slugify(container.id);

  return slugify([...container.classList].join("-")) || "block";
}

function getEditableKey(item, index, items) {
  const section = item.closest("section[id]")?.id || "page";
  const container = getContainerLabel(item);
  const text = slugify(item.textContent) || item.tagName.toLowerCase();
  const base = `${section}:${container}:${item.tagName.toLowerCase()}:${text}`;
  const sameBaseIndex = items
    .slice(0, index)
    .filter((candidate) => {
      const candidateSection = candidate.closest("section[id]")?.id || "page";
      const candidateContainer = getContainerLabel(candidate);
      const candidateText = slugify(candidate.textContent) || candidate.tagName.toLowerCase();
      return `${candidateSection}:${candidateContainer}:${candidate.tagName.toLowerCase()}:${candidateText}` === base;
    }).length;

  return `${storagePrefix}v2:${base}:${sameBaseIndex}`;
}

editableItems.forEach((item, index) => {
  const key = getEditableKey(item, index, editableItems);
  const legacyKey = `${legacyStoragePrefix}${index}`;
  item.dataset.editableKey = key;
  item.dataset.legacyEditableKey = legacyKey;
  const saved = localStorage.getItem(key) ?? localStorage.getItem(legacyKey);

  if (saved !== null) {
    item.textContent = saved;
    localStorage.setItem(key, saved);
  }

  item.addEventListener("input", () => {
    localStorage.setItem(key, item.textContent.trim());
    setStatus("Saved");
  });

  item.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  });
});

function getSavedProfileCrop() {
  try {
    return { ...defaultProfileCrop, ...JSON.parse(localStorage.getItem(profileCropKey)) };
  } catch {
    return defaultProfileCrop;
  }
}

function applyProfileCrop(crop) {
  if (!profileCropPreview) return;
  profileCropPreview.style.setProperty("--profile-zoom", crop.zoom);
  profileCropPreview.style.setProperty("--profile-x", `${crop.x}px`);
  profileCropPreview.style.setProperty("--profile-y", `${crop.y}px`);
}

function syncProfileCropInputs(crop) {
  profileCropInputs.forEach((input) => {
    input.value = crop[input.dataset.profileCropInput];
  });
}

if (profileCropPreview && profileCropInputs.length) {
  const savedCrop = getSavedProfileCrop();
  applyProfileCrop(savedCrop);
  syncProfileCropInputs(savedCrop);

  profileCropInputs.forEach((input) => {
    input.addEventListener("input", () => {
      const nextCrop = profileCropInputs.reduce((crop, currentInput) => {
        crop[currentInput.dataset.profileCropInput] = Number(currentInput.value);
        return crop;
      }, {});

      applyProfileCrop(nextCrop);
      localStorage.setItem(profileCropKey, JSON.stringify(nextCrop));
      setStatus("Photo crop saved");
    });
  });
}

function setStatus(message) {
  if (!editStatus) return;
  editStatus.textContent = message;
}

function setEditing(nextEditing) {
  editing = nextEditing;
  document.body.classList.toggle("is-editing", editing);
  editableItems.forEach((item) => {
    item.contentEditable = editing ? "true" : "false";
    item.spellcheck = editing;
  });
  editToggle.textContent = editing ? "Done" : "Edit";
  setStatus(editing ? "Click any highlighted text" : "Edits saved in this browser");
}

editToggle?.addEventListener("click", () => {
  setEditing(!editing);
});

editReset?.addEventListener("click", () => {
  const shouldReset = window.confirm("Reset all edited text back to the original version?");
  if (!shouldReset) return;

  Object.keys(localStorage)
    .filter((key) => key.startsWith(storagePrefix))
    .forEach((key) => localStorage.removeItem(key));
  window.location.reload();
});

linkedCards.forEach((card) => {
  const openCardLink = () => {
    if (editing) return;
    window.location.href = card.dataset.cardLink;
  };

  card.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) return;
    openCardLink();
  });

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    openCardLink();
  });
});
