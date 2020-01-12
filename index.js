import csv from 'csvtojson'
import _ from 'underscore'
import fs from 'fs'
import regression from 'regression'

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

function generateChartJs(divId, title, xAxisLabel, yAxisLabel, ...traces) {
  const layout = {
    title: title,
    xaxis: {
      title: xAxisLabel
    },
    yaxis: {
      title: yAxisLabel
    }
  };

  return `Plotly.plot(${JSON.stringify(divId)}, ${JSON.stringify(traces)}, ${JSON.stringify(layout)});\n`;
}

function extractTrace(data, name, xProperty, yProperty) {
  return {
    x: _.pluck(data, xProperty),
    y: _.pluck(data, yProperty),
    name: name,
    mode: "markers"
  };
}

function linearRegression(trace) {
  const points = _.zip(trace.x, trace.y);
  const result = regression.linear(points);
  const [x, y] = _.unzip(result.points);

  return {
    x: x,
    y: y,
    name: `Regression of ${trace.name}<br>(${result.string}; r2=${result.r2})`,
    mode: "lines"
  }
}

function ruleOfThumbLine(trace, fractionX) {
  function predict(x) {
    return fractionX * x;
  }

  const x = trace.x.slice(); // copy the array

  if (x[0] !== 0) { // make it start at the origin
    x.unshift(0);
  }

  const y = x.map(predict);

  return {
    x: x,
    y: y,
    name: `Rule of Thumb (y = ${fractionX}x)`,
    mode: "lines"
  }
}

function exponentialRegression(trace) {
  const points = _.zip(trace.x, trace.y);
  const result = regression.exponential(points);
  const x = _.range(_.min(trace.x), _.max(trace.x) + 1);
  const y = x.map(x => result.predict(x)[1]);

  return {
    x: x,
    y: y,
    name: `Regression of ${trace.name}<br>(${result.string}; r2=${result.r2})`,
    mode: "lines"
  }
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

  // write plots
  const writeStream = fs.createWriteStream('./plots.js');

  // depreciation curve
  {
    const boatsTrace = extractTrace(boatsWithNewPrice, "Boats", 'ageAtPurchase', 'depreciatedValue');
    const regression = exponentialRegression(boatsTrace);
    writeStream.write(generateChartJs('depreciation', "Depreciation", "Age at Purchase (years)", "Fraction of Original Price",
      boatsTrace,
      regression,
    ));
  }

  // maintenance cost vs purchase price
  {
    const sortedByPurchasePrice = _.sortBy(boats, 'adjustedPurchasePrice');
    const trace0 = extractTrace(sortedByPurchasePrice, "Boats", 'adjustedPurchasePrice', 'maintenancePrice');
    const trace1 = linearRegression(trace0);
    const trace2 = ruleOfThumbLine(trace0, 0.10, 0);

    writeStream.write(generateChartJs('maintenancePurchase', "Maintenance Cost vs Purchase Price", "Purchase Price (US$)", "Maintenance Cost (US$)",
      trace0,
      trace1,
      trace2
    ));
  }

  // maintenance cost vs purchase price <$50k
  {
    const filtered = _.filter(_.sortBy(boats, 'adjustedPurchasePrice'), boat => boat.adjustedPurchasePrice <= 50000);
    const trace0 = extractTrace(filtered, "Boats", 'adjustedPurchasePrice', 'maintenancePrice');
    const trace1 = linearRegression(trace0);
    const trace2 = ruleOfThumbLine(trace0, 0.10, 0);

    writeStream.write(generateChartJs('maintenancePurchase50k', "Maintenance Cost vs Purchase Price (<$50k)", "Purchase Price (US$)", "Maintenance Cost (US$)",
      trace0,
      trace1,
      trace2
    ));
  }

  // maintenance cost vs new price
  {
    const boatsWithNewPriceSorted = _.sortBy(boatsWithNewPrice, 'adjustedNewPrice');
    const trace0 = extractTrace(boatsWithNewPriceSorted, "Boats", 'adjustedNewPrice', 'maintenancePrice');
    const trace1 = linearRegression(trace0);
    const trace2 = ruleOfThumbLine(trace0, 0.02, 0);

    writeStream.write(generateChartJs('maintenanceNew', "Maintenance Cost vs New Price", "New Price (US$)", "Maintenance Cost (US$)",
      trace0,
      trace1,
      trace2
    ));
  }
}

main();
