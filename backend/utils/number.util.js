function formatNumber(son) {
  let [butun, kasr] = son.toFixed(2).split(".");
  butun = butun.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return butun + "." + kasr;
}

module.exports = formatNumber;
