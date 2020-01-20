This is the code I used to analyze data from a survey of boat owners to figure out if there is a rule of thumb that can actually estimate maintenance costs.  You can read the results in my [blog post](https://sailsgoal.com/blog/estimating-boat-maintenance-costs).

It's my hope that this repo will serve as an example for anyone trying to get started with Plotly and simple statistics processing in Javascript.  It also allows the public to check the math in my blog post.

# How it works
All of the code is in the index.js file.  It's not very complex, so I suggest you look at it and follow along:
1. It reads a couple CSV files, one for inflation data and the other for the survey results, using [csvtojson](https://github.com/Keyang/node-csvtojson), which I found much easier to use than the alternatives.
2. It does some inflation adjustment using numbers from the US Bureau of Labor Statistics.  Given a value and a year you want to adjust _from_, you can adjust that value by dividing it by the number in the CPI data for that year, and then multiplying it by the CPI number for the year you want to adjust it _to_.
3. It pre-calculates some data for each survey result, such as the depreciated value and the age.
4. It generates charts.  The charts are provided by [Plotly](https://plot.ly).  Regression lines are provided by [regression](https://github.com/tom-alexander/regression-js).

# Running it
1. You'll need [Node](https://nodejs.org/) and [NPM](https://www.npmjs.com/) on your machine.
1. Clone this repository to your machine.
1. Install dependencies by running `npm install`
1. Download CPI data from [here](https://download.bls.gov/pub/time.series/cu/cu.data.2.Summaries) and put it in the same directory as the script, keeping the file name.  The script uses this data to adjust for inflation.  (NB: at the time this code was written, there was only partial data available for 2019, so there's a hack in the code to deal with that).
1. Provide some boat data for it to crunch.  I can't give you my data, because I promised anonymity to the survey respondents, but your data should be a CSV with columns (and header names) like this:
   * timestamp - not used
   * type - "Sailboat" or "Power boat"
   * hulls - "Monohull" or "Multihull"
   * length - in feet
   * builtYear
   * purchasePrice
   * purchaseYear
   * newPrice
   * maintenancePrice
   * condition - 1 to 5, 5 is "Bristol fashion"
1. Run the actual analysis by running `node -r esm index.js`, which will generate a "plots.js" file.
1. Open the "index.html" file included in this repository, which will load the plots for viewing in your browser.

# General notes
* All price/cost amounts are in USD
* Maintenance prices are assumed to be in CURRENT\_YEAR dollars (that constant is defined at the top of index.js)

# License (MIT)

Copyright 2020 SailsGoal, LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
