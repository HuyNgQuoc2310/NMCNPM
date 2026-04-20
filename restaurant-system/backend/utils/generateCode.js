function generateCode(prefix) {
  const timestamp = Date.now().toString().slice(-8);
  const randomSuffix = Math.floor(Math.random() * 900 + 100);

  return `${prefix}${timestamp}${randomSuffix}`;
}

module.exports = generateCode;
