function buildPlaceholders(count) {
  return Array.from({ length: count }, () => "?").join(", ");
}

module.exports = buildPlaceholders;
