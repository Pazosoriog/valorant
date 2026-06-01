function apiUrl(path) {
  const base = window.VALORANT_API_BASE_URL || "";
  return `${base.replace(/\/$/, "")}${path}`;
}
