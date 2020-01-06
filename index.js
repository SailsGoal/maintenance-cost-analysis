import csv from 'csvtojson'
import _ from 'underscore'

const CURRENT_YEAR = 2019;

async function loadData() {
  return csv({
    checkType: true,
  })
  .fromFile('./data.csv');
}

// consumer price index
class InflationAdjuster {
  constructor(map) {
    this.map = map;
  }

  static async load() {
    const map = new Map();

    return csv({
        delimiter: "auto",
        checkType: true,
        ignoreEmpty: true
      })
      .fromFile('./cu.data.2.Summaries')
      .subscribe(async row => {
        // filter annual data for all urban consumers
        // except 2019, which is still in progress, so we pick the last month in the data set
        // TODO if it's 2020 or later when you're reading this, you can remove this hack
        if (row.series_id === 'CUUR0000SA0' && (row.period === 'M13' || (row.period === 'M11' && row.year === 2019))) {
          map.set(row.year, row.value);
        }
      })
      .then(() => {
        return new InflationAdjuster(map);
      });
  }

  adjust(value, fromYear, toYear) {
    return value * this.map.get(toYear) / this.map.get(fromYear);
  }
}

// calculate the percentage of the new-price the vessel still held at its most recent purchase
function calcDepreciation(boats) {
  return _.chain(boats)
    .map(boat => _.pick(boat, 'ageAtPurchase', 'depreciatedValue', 'purchasePrice'))
    .sortBy('ageAtPurchase')
    .value();
}

function generateChartJs(divId, ...traces) {
  return `Plotly.plot(${JSON.stringify(divId)}, ${JSON.stringify(traces)}, {
    margin: { t: 0 }
  });`;
}

function extractTrace(data, name, xProperty, yProperty) {
  return {
    x: _.pluck(data, xProperty),
    y: _.pluck(data, yProperty),
    name: name
  };
}

function partitionByType(data) {
  const partitioned = _.partition(data, boat => boat.type === 'Sailboat');
  return {
    sailboats: partitioned[0],
    powerboats: partitioned[1]
  };
}

async function main() {
  const boats = await loadData();
  const inflationAdjuster = await InflationAdjuster.load();

  // massage data
  boats.forEach(boat => {
    boat.adjustedPurchasePrice = inflationAdjuster.adjust(boat.purchasePrice, boat.purchaseYear, CURRENT_YEAR);
    if (boat.newPrice) {
      boat.adjustedNewPrice = inflationAdjuster.adjust(boat.newPrice, boat.builtYear, CURRENT_YEAR);
      boat.depreciatedValue = boat.adjustedPurchasePrice / boat.adjustedNewPrice;
    }
    boat.ageNow = CURRENT_YEAR - boat.builtYear;
    boat.ageAtPurchase = boat.purchaseYear - boat.builtYear;
  });

  const boatsWithNewPrice = _.filter(boats, boat => Boolean(boat.newPrice));

  const sortedByAge = _.sortBy(boatsWithNewPrice, 'ageAtPurchase');
  const sortedByAgeByType = partitionByType(sortedByAge);
  console.log(generateChartJs('depreciation',
    extractTrace(sortedByAgeByType.sailboats, "Sailboats", 'ageAtPurchase', 'depreciatedValue'),
    extractTrace(sortedByAgeByType.powerboats, "Powerboats", 'ageAtPurchase', 'depreciatedValue')
  ));
}

main();
