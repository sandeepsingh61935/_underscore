// Typography preset system — uniform across modes (per Sandy),
// user-selectable, with distinct treatment for library hierarchy levels.
// Each preset defines: serif (voice), sans (UI), mono (meta), and
// distinct sizes/styles for the 3 library levels.

const TYPE_PRESETS = {
  editorial: {
    name: "Editorial",
    note: "Source Serif · Inter · JetBrains Mono",
    google: "Source+Serif+4:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500",
    serif: '"Source Serif 4", Georgia, serif',
    sans:  '"Inter", -apple-system, Arial, sans-serif',
    mono:  '"JetBrains Mono", ui-monospace, monospace',
  },
  classic: {
    name: "Classic",
    note: "Playfair · Source Sans · IBM Plex Mono",
    google: "Playfair+Display:ital,wght@0,500;0,600;1,500&family=Source+Sans+3:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500",
    serif: '"Playfair Display", "Times New Roman", serif',
    sans:  '"Source Sans 3", -apple-system, sans-serif',
    mono:  '"IBM Plex Mono", ui-monospace, monospace',
  },
  modern: {
    name: "Modern",
    note: "Fraunces · Manrope · Geist Mono",
    google: "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Manrope:wght@400;500;600&family=Geist+Mono:wght@400;500",
    serif: '"Fraunces", Georgia, serif',
    sans:  '"Manrope", -apple-system, sans-serif',
    mono:  '"Geist Mono", ui-monospace, monospace',
  },
  humanist: {
    name: "Humanist",
    note: "Lora · Work Sans · Roboto Mono",
    google: "Lora:ital,wght@0,400;0,500;0,600;1,400&family=Work+Sans:wght@400;500;600&family=Roboto+Mono:wght@400;500",
    serif: '"Lora", Georgia, serif',
    sans:  '"Work Sans", -apple-system, sans-serif',
    mono:  '"Roboto Mono", ui-monospace, monospace',
  },
};

// Inject the chosen preset's Google Fonts link & swap CSS variables.
function applyTypePreset(id) {
  const p = TYPE_PRESETS[id] || TYPE_PRESETS.editorial;
  // Add or update <link> for fonts
  let link = document.getElementById("type-preset-link");
  if (!link) {
    link = document.createElement("link");
    link.id = "type-preset-link";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = `https://fonts.googleapis.com/css2?family=${p.google}&display=swap`;
  document.documentElement.style.setProperty("--serif", p.serif);
  document.documentElement.style.setProperty("--sans",  p.sans);
  document.documentElement.style.setProperty("--mono",  p.mono);
}

window.TYPE_PRESETS = TYPE_PRESETS;
window.applyTypePreset = applyTypePreset;
