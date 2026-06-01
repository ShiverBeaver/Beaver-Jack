import { loadCustomLevelConfig, saveCustomLevelConfig } from '../core/storage.js';

// Default source images for the custom level editor. 
// If the player does not upload a template, the empty template is used.
const DEFAULT_TEMPLATE_PATH = './assets/generation/leveltemplates/empty.png';
const DEFAULT_NOISE_PATH = './assets/generation/noise/perlin_scale18_detail3.png';
// localStorage is limited, so uploaded template images are guarded by size.
const MAX_LOCALSTORAGE_IMAGE_BYTES = 3_500_000;

// Default one-off custom level configuration. 
// The editor stores only the last submitted config, not a list of saved levels.
const DEFAULT_CUSTOM_LEVEL = {
  levelSize: 32,
  templateImageDataUrl: '',
  templateImageName: '',
  templateMultiplier: 1,
  noiseMultiplier: 6,
  heightOffset: 0,
  waterLevel: 4,
  treeCount: 30
};

// Renders the simplified level editor form.
// It creates one custom level and starts it immediately after validation.
export function renderCustomLevelScreen({ root, onNavigate }) {
  const savedConfig = loadCustomLevelConfig() ?? {};
  const formState = normalizeFormState(savedConfig);

  root.innerHTML = `
    <section class="screen custom-level-screen">
      <div class="pixel-panel custom-level-screen__panel">
        <h2 class="panel-title">Level Editor</h2>
        <p class="panel-text">Create a custom configured level and play it right away.</p>

        <form id="custom-level-form" class="custom-level-form" novalidate>
          ${renderSlider({
            id: 'levelSize',
            label: 'Level size',
            min: 10,
            max: 128,
            value: formState.levelSize
          })}

          <div class="form-row">
            <label for="templateImage">Upload template image (Optional)</label>
            <input id="templateImage" class="file-input" type="file" accept="image/png,image/jpeg,image/webp">
            <div class="template-file-status" data-template-file-status>
              ${formState.templateImageDataUrl
                ? `Saved uploaded image: ${escapeHtml(formState.templateImageName || 'custom image')}`
                : 'No uploaded image saved. The default empty template will be used.'}
            </div>
            <button class="text-button" type="button" data-action="clear-template-image">Clear uploaded image</button>
          </div>

          ${renderSlider({
            id: 'templateMultiplier',
            label: 'Template map multiplier',
            min: 0,
            max: 12,
            value: formState.templateMultiplier,
            disabled: !hasUploadedTemplate(formState)
          })}

          ${renderSlider({
            id: 'noiseMultiplier',
            label: 'Noise multiplier',
            min: 0,
            max: 24,
            value: formState.noiseMultiplier
          })}

          ${renderSlider({
            id: 'heightOffset',
            label: 'Height offset',
            min: -8,
            max: 20,
            value: formState.heightOffset
          })}

          ${renderSlider({
            id: 'waterLevel',
            label: 'Water level',
            min: 0,
            max: 30,
            value: formState.waterLevel
          })}

          ${renderSlider({
            id: 'treeCount',
            label: 'Tree count',
            min: 0,
            max: 600,
            value: formState.treeCount
          })}

          <div class="custom-level-error" data-custom-level-error aria-live="polite"></div>

          <div class="custom-level-form__actions">
            <button class="pixel-button" type="submit">Play</button>
            <button class="pixel-button" type="button" data-action="reset">Reset</button>
            <button class="pixel-button" type="button" data-action="back">Back</button>
          </div>
        </form>
      </div>
    </section>
  `;

  const form = root.querySelector('#custom-level-form');
  const errorBox = root.querySelector('[data-custom-level-error]');
  const templateImageInput = root.querySelector('#templateImage');
  const fileStatus = root.querySelector('[data-template-file-status]');
  const templateMultiplierInput = root.querySelector('#templateMultiplier');
  const templateMultiplierRow = templateMultiplierInput.closest('.range-row');

  let uploadedTemplateImageDataUrl = formState.templateImageDataUrl ?? '';
  let uploadedTemplateImageName = formState.templateImageName ?? '';

  root.querySelectorAll('[data-range-output]').forEach((output) => {
    const input = root.querySelector(`#${output.dataset.rangeOutput}`);
    input.addEventListener('input', () => {
      output.textContent = input.value;
    });
  });

  // Template multiplier only matters when a real uploaded template exists.
  function updateTemplateMultiplierState() {
    const hasTemplate = Boolean(uploadedTemplateImageDataUrl);
    templateMultiplierInput.disabled = !hasTemplate;
    templateMultiplierRow.classList.toggle('range-row--disabled', !hasTemplate);
  }

  function updateFileStatus() {
    fileStatus.textContent = uploadedTemplateImageDataUrl
      ? `Selected image: ${uploadedTemplateImageName || 'custom image'}`
      : 'No uploaded image saved. The default empty template will be used.';
  }

  function setSliderValue(id, value) {
    const input = root.querySelector(`#${id}`);
    const output = root.querySelector(`[data-range-output="${id}"]`);
    input.value = String(value);
    output.textContent = String(value);
  }

  // Resets both visible form controls and the persisted custom-level config.
  function resetFormToDefaults() {
    errorBox.textContent = '';
    uploadedTemplateImageDataUrl = DEFAULT_CUSTOM_LEVEL.templateImageDataUrl;
    uploadedTemplateImageName = DEFAULT_CUSTOM_LEVEL.templateImageName;
    templateImageInput.value = '';

    setSliderValue('levelSize', DEFAULT_CUSTOM_LEVEL.levelSize);
    setSliderValue('templateMultiplier', DEFAULT_CUSTOM_LEVEL.templateMultiplier);
    setSliderValue('noiseMultiplier', DEFAULT_CUSTOM_LEVEL.noiseMultiplier);
    setSliderValue('heightOffset', DEFAULT_CUSTOM_LEVEL.heightOffset);
    setSliderValue('waterLevel', DEFAULT_CUSTOM_LEVEL.waterLevel);
    setSliderValue('treeCount', DEFAULT_CUSTOM_LEVEL.treeCount);

    updateFileStatus();
    updateTemplateMultiplierState();

    try {
      saveCustomLevelConfig(buildCustomLevelConfig(DEFAULT_CUSTOM_LEVEL));
    } catch (error) {
      console.error(error);
      errorBox.textContent = 'Could not reset saved custom level data.';
    }
  }

  // File API entry point: the selected image is converted to a data URL so it
  // can be reused after redirecting to the game route or refreshing the page.
  templateImageInput.addEventListener('change', async () => {
    errorBox.textContent = '';
    const file = templateImageInput.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      templateImageInput.value = '';
      errorBox.textContent = 'Please choose an image file.';
      return;
    }

    if (file.size > MAX_LOCALSTORAGE_IMAGE_BYTES) {
      templateImageInput.value = '';
      errorBox.textContent = 'Image is too large for localStorage. Please use a smaller template image.';
      return;
    }

    try {
      uploadedTemplateImageDataUrl = await readFileAsDataUrl(file);
      uploadedTemplateImageName = file.name;
      updateFileStatus();
      updateTemplateMultiplierState();
    } catch (error) {
      console.error(error);
      errorBox.textContent = 'Failed to read the selected image.';
    }
  });

  root.querySelector('[data-action="clear-template-image"]').addEventListener('click', () => {
    uploadedTemplateImageDataUrl = '';
    uploadedTemplateImageName = '';
    templateImageInput.value = '';
    updateFileStatus();
    updateTemplateMultiplierState();
  });

  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    resetFormToDefaults();
  });

  root.querySelector('[data-action="back"]').addEventListener('click', () => {
    onNavigate('levels');
  });

  // Validates image dimensions, saves the config to localStorage and starts the playable custom level.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.textContent = '';

    const levelSize = Number(root.querySelector('#levelSize').value);
    const templateMultiplier = uploadedTemplateImageDataUrl
      ? Number(templateMultiplierInput.value)
      : DEFAULT_CUSTOM_LEVEL.templateMultiplier;
    const noiseMultiplier = Number(root.querySelector('#noiseMultiplier').value);
    const heightOffset = Number(root.querySelector('#heightOffset').value);
    const waterLevel = Number(root.querySelector('#waterLevel').value);
    const treeCount = Number(root.querySelector('#treeCount').value);
    const templatePath = uploadedTemplateImageDataUrl || DEFAULT_TEMPLATE_PATH;

    try {
      const [templateDimensions, noiseDimensions] = await Promise.all([
        getImageDimensions(templatePath),
        getImageDimensions(DEFAULT_NOISE_PATH)
      ]);

      if (levelSize < 10) {
        errorBox.textContent = 'Level size must be at least 10.';
        return;
      }

      if (levelSize > templateDimensions.width || levelSize > templateDimensions.height) {
        errorBox.textContent = `Level size must fit inside the template image (${templateDimensions.width}×${templateDimensions.height}).`;
        return;
      }

      if (levelSize > noiseDimensions.width || levelSize > noiseDimensions.height) {
        errorBox.textContent = `Level size must fit inside the noise image (${noiseDimensions.width}×${noiseDimensions.height}).`;
        return;
      }

      const customLevelConfig = buildCustomLevelConfig({
        levelSize,
        templateImageDataUrl: uploadedTemplateImageDataUrl,
        templateImageName: uploadedTemplateImageName,
        templateMultiplier,
        noiseMultiplier,
        heightOffset,
        waterLevel,
        treeCount
      });

      try {
        saveCustomLevelConfig(customLevelConfig);
      } catch (storageError) {
        console.error(storageError);
        errorBox.textContent = 'Could not save the custom level. Try a smaller uploaded image.';
        return;
      }

      onNavigate('game', { level: 'custom' });
    } catch (error) {
      console.error(error);
      errorBox.textContent = 'Could not load the template image. Try another uploaded image.';
    }
  });
}

// Converts older saved config shape back into values the form controls expect.
function normalizeFormState(savedConfig) {
  return {
    ...DEFAULT_CUSTOM_LEVEL,
    ...savedConfig,
    templateMultiplier: savedConfig.heightTemplateRange?.[0] ?? savedConfig.templateMultiplier ?? DEFAULT_CUSTOM_LEVEL.templateMultiplier,
    noiseMultiplier: savedConfig.heightNoiseRange?.[0] ?? savedConfig.noiseMultiplier ?? DEFAULT_CUSTOM_LEVEL.noiseMultiplier
  };
}

// Converts form values into the same configuration shape as built-in levels.
// Village generation is intentionally disabled for custom levels.
function buildCustomLevelConfig(values) {
  const templateImageDataUrl = values.templateImageDataUrl ?? '';
  const templateImageName = values.templateImageName ?? '';
  const templateMultiplier = templateImageDataUrl
    ? Number(values.templateMultiplier)
    : DEFAULT_CUSTOM_LEVEL.templateMultiplier;
  const noiseMultiplier = Number(values.noiseMultiplier);

  return {
    id: 'custom',
    isCustom: true,
    name: 'Custom Level',
    generateVillage: false,
    ignoreVillageTemplate: true,
    villageRadius: 0,
    housesRange: [0, 0],
    levelSize: Number(values.levelSize),
    templateImageDataUrl,
    templateImageName,
    templatePath: DEFAULT_TEMPLATE_PATH,
    noisePath: DEFAULT_NOISE_PATH,
    heightNoiseRange: [noiseMultiplier, noiseMultiplier],
    heightTemplateRange: [templateMultiplier, templateMultiplier],
    heightOffset: Number(values.heightOffset),
    waterLevel: Number(values.waterLevel),
    treeCount: Number(values.treeCount)
  };
}

// Small helper for integer slider fields used by the editor.
function renderSlider({ id, label, min, max, value, disabled = false }) {
  return `
    <div class="form-row range-row ${disabled ? 'range-row--disabled' : ''}">
      <label for="${id}">${label}: <output data-range-output="${id}">${Number(value)}</output></label>
      <input
        id="${id}"
        type="range"
        min="${min}"
        max="${max}"
        step="1"
        value="${Number(value)}"
        ${disabled ? 'disabled' : ''}
      >
    </div>
  `;
}

function hasUploadedTemplate(formState) {
  return Boolean(formState.templateImageDataUrl);
}

// Promise wrapper around FileReader for uploaded template images.
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed.'));
    reader.readAsDataURL(file);
  });
}

// Loads an image only to check whether the chosen level size fits inside it.
function getImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}

// Escapes file names before placing them into generated HTML.
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
