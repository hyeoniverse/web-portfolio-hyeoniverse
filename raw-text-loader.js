/** Minimal raw-text loader for Turbopack — zero dependencies */
module.exports = function (source) {
  return `export default ${JSON.stringify(source)};`;
};
