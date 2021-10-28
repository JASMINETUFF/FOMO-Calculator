var calcsEl = document.querySelector("#calculations"); // Main container for chart and calculations
var investEl = document.querySelector("#invest");
var tickerChart; //

// New Card elements
var infoMain = document.querySelector("#info-main div");
var infoPast = document.querySelector("#info-past div");
var infoChange = document.querySelector("#info-change div");
var infoCurrent = document.querySelector("#info-current div");
var infoChart = document.querySelector("#info-chart div");
var infoTwitter = document.querySelector("#info-twitter div");

//#info-main, #info-past, #info-change, #info-current, #info-chart, #info-twitter

// Wrapper function to accept api call data and run displayTicker and displayCalcs
function calcAndChart(name,currentPrice,historicalData,type) {

  // Extract data from expected API output format based on if type = 'stock' or 'coin'
  values = extractData(historicalData,currentPrice,type);

  // If current price was not defined in the api call functions, approximate it from the last historical value
  if (currentPrice === undefined) {
    currentPrice = values.prices[values.prices.length-1]
  }

  // Remove duplicate output, will be removed as UI adds cards for output
  if (calcsEl.children.length > 2) {
    while (calcsEl.children[2]) {
      calcsEl.removeChild(calcsEl.children[2])
    }
  }

  displayTicker(values,name,type);
  displayCalcs(values,currentPrice,name);
}


// Creating chart of historic stock or coin values
function displayTicker(values,name,type) {
  
  if (tickerChart) {
    tickerChart.destroy();
  }

  let times = values.times;
  let prices = values.prices;

  // Chart.js implemented plots
  let chartData = {
    labels: times,
    datasets: [{
      label: name + ' Price History',
      backgroundColor: 'rgb(255, 99, 132)',
      borderColor: 'rgb(255, 99, 132)',
      data: prices,
    }]
  };
  
  // TODO, improve chart look
  // Ideas, add cumulative area-type light shading of red and green?
  let config = {
    type: 'line',
    data: chartData,
    options: {}
  };

  tickerChart = new Chart(
    document.querySelector("#stock-canvas"),
    config
  );

}

// Calculating potential earnings and adding to ui
function displayCalcs(values,currentPrice,name) {

  // pull list of times and prices from extracted data
  let times = values.times;
  let prices = values.prices;

  // Calculating the final investment value
  let investAmount = extractInvestment(); 
  let result = (investAmount) * (currentPrice/prices[0]);

  // Historical day is not precisely as input, workaround: assume first historic point and user input date values are similar
  // TODO: functionality for if a user selects a date before the coin was available
  let queryDate = moment(document.getElementById("search-date").value).format('MMMM DD, YYYY')

  clearCards()

  // Displaying to infoMain: primary FOMO calculation and result sentence
  infoMain.textContent = `If you had bought ${formatPrice(investAmount)} of ${name} on ${queryDate}, you would have ${formatPrice(result)}.`;


  // Displaying to infoPast: Query date and value 
  
  let pastHeader = document.createElement("h2");
  pastHeader.textContent = "Then";
  pastHeader.classList = "title is-4";

  let pastDate = document.createElement("p");
  pastDate.textContent = queryDate;
  pastDate.classList = "card-date";

  let pastBody = document.createElement("h3");
  pastBody.textContent = formatPrice(prices[0]);
  pastBody.classList = "title is-3";

  infoPast.append(pastHeader)
  infoPast.append(pastDate)
  infoPast.append(pastBody)


  // Displaying to infoChange: change in value, percent change, add red/green arrow?
  let changeHeader = document.createElement("h2");
  changeHeader.textContent = "Change";
  changeHeader.classList = "title is-4";

  let changeValue = document.createElement("h3");
  changeValue.textContent = formatPrice(currentPrice-prices[0]);
  changeValue.classList = "title is-3";

  let changePercent = document.createElement("h3");
  let pctChange = (100*(currentPrice-prices[0])/prices[0]).toFixed(3);
  changePercent.textContent = pctChange + "%";
  changePercent.classList = "title is-3";
  if (currentPrice > prices[0]) {
    changeValue.setAttribute("style","color:green")
    changePercent.setAttribute("style","color:green")
  } else if (currentPrice < prices[0]) {
    changeValue.setAttribute("style","color:red")
    changePercent.setAttribute("style","color:red")
  }

  infoChange.append(changeHeader)
  infoChange.append(changeValue)
  infoChange.append(changePercent)



  // Display main FOMO calculation
  let mainResult = document.createElement("h2");

  

  infoMain.textContent = `If you had bought ${formatPrice(investAmount)} of ${name} on ${queryDate}, you would have ${formatPrice(result)}.`;

  calcsEl.append(mainResult);

  calcsEl.append(document.createElement("br"));

  // Calculate best time to sell
  let statsMax = document.createElement("p");
  let maxIndex = prices.indexOf(Math.max(...prices));

  statsMax.innerHTML = `The best time to sell ${name} was on ${times[maxIndex]} at ${formatPrice(prices[maxIndex])}`

  infoChange.append(statsMax);

  // TODO add a reset to rehide results?
  document.querySelector("#calculation-container").setAttribute("style","display:block");

}

// Utility Functions
// Function to determine which day interval to call from coinpaprika so that results are smooth and cover the whole date range.
function determineInterval(startDate,endDate) {
  let maxPoints = 900; // Maximum historical points from api call
  let intervals = [1,7,14,30,90]; // coinpaprika available day intervals
  let start = moment(startDate,'mm-dd-yyyy');
  let end = moment(endDate,'mm-dd-yyyy');
  
  let diffDays = moment.duration(end.diff(start)).asDays();
  
  // Loop through intervals until the smallest interval that will cover the whole date range
  for (let ii = 0; ii < intervals.length; ii++) {
    if (diffDays/intervals[ii] < maxPoints) {
      return intervals[ii]
    }
  }

  // if no matching interval was found default behavior as 14d
  return 14

}

// Function to pull times and prices from coins or stocks historical data array
// checks if type is 'coin' or 'stock' to parse the passed in data structure
function extractData(data,currentPrice,type) {
  let times = [];
  let prices = [];

  if (type == 'coin') {
    data.forEach((entry) => {
      times.push(moment(entry.timestamp,'YYYY-MM-DDThh:mm:ssZ').format('MMMM DD, YYYY'));
      prices.push(entry.price);
    })
    times.push(moment().format('MMMM DD, YYYY'))
    prices.push(currentPrice)

  } else if (type == 'stock') {
    // Stock api, price data buried in data.chart.result[0].indicators.quote[0].high
    data.chart.result[0].indicators.quote[0].high.forEach((entry) => {
      prices.push(entry);
    })
    data.chart.result[0].timestamp.forEach((entry) => {
      times.push(moment.unix(entry).format('MMMM DD, YYYY'));
    })
  }

  return {'times':times,'prices':prices}
}

// Convert price string or number to formatted string
function formatPrice(price) {
  let sign = "" // carry the minus sign to end if present
  if (typeof price !== "string") {
    if (price >= 0) {
      s = String(price.toFixed(2));
    } else {
      s = String(Math.abs(price.toFixed(2)));
      sign = "-"
    }
   
  } else {
    s = price;
  }
  if (s[0] != '$') {
    s = '$' + s
  }

  // Add appropriate commas and formatting using regex a la https://www.codegrepper.com/code-examples/javascript/javascript+format+currency+with+commas
  return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// Extract investment value from formatted string
function extractInvestment() {
  let investString = investEl.value;

  return Number(investString.replace(/[^0-9\.-]+/g,""))
}

// Removing children from all output data cards
function clearCards() {
  let cards = [infoMain,infoPast,infoChange,infoCurrent,infoTwitter];
  cards.forEach((card) => {
    while (card.firstChild) {
      card.removeChild(card.firstChild);
    }
  })
}

// Start of code from Robby-api branch
$("input[id='invest']").on({
  keyup: function() {
    formatCurrency($(this));
  },
  blur: function() { 
    formatCurrency($(this), "blur");
  }
});

function formatNumber(n) {
  return n.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function formatCurrency(input, blur) {
  // appends $ to value, validates decimal side
  // and puts cursor back in right position.

  var input_val = input.val();

  if (input_val === "") { return; }

  var original_len = input_val.length;

  var caret_pos = input.prop("selectionStart");
    
  // check for decimal
  if (input_val.indexOf(".") >= 0) {

  //prevents multiple decimal places
    var decimal_pos = input_val.indexOf(".");

  // split number by decimal point
    var left_side = input_val.substring(0, decimal_pos);
    var right_side = input_val.substring(decimal_pos);

    // add commas to left side of number
    left_side = formatNumber(left_side);

    // validate right side
    right_side = formatNumber(right_side);
      
    // On blur make sure 2 numbers after decimal
    if (blur === "blur") {
      right_side += "00";
    }
      
    // Limit decimal to only 2 digits
    right_side = right_side.substring(0, 2);

    // join number by .
    input_val = "$" + left_side + "." + right_side;

  } else {
    // no decimal entered
    // add commas to number
    // remove all non-digits
    input_val = formatNumber(input_val);
    input_val = "$" + input_val;
    
    // final formatting
    if (blur === "blur") {
      input_val += ".00";
    }
  }

  // send updated string to input
  input.val(input_val);

//Convert input to currecny as user inputs values
$("input[id='invest']").on({
  keyup: function() {
    formatCurrency($(this));
  },
  blur: function() { 
    formatCurrency($(this), "blur");
  }
});
function formatNumber(n) {
return n.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}
function formatCurrency(input, blur) {
// appends $ to value, validates decimal side
// and puts cursor back in right position.

var input_val = input.val();

if (input_val === "") { return; }

var original_len = input_val.length;

var caret_pos = input.prop("selectionStart");
  
// check for decimal
if (input_val.indexOf(".") >= 0) {

//prevents multiple decimal places
  var decimal_pos = input_val.indexOf(".");

// split number by decimal point
var left_side = input_val.substring(0, decimal_pos);
var right_side = input_val.substring(decimal_pos);

// add commas to left side of number
left_side = formatNumber(left_side);

// validate right side
right_side = formatNumber(right_side);
  
// On blur make sure 2 numbers after decimal
if (blur === "blur") {
  right_side += "00";
  }
  
// Limit decimal to only 2 digits
  right_side = right_side.substring(0, 2);

// join number by .
  input_val = "$" + left_side + "." + right_side;

} else {
  // no decimal entered
  // add commas to number
  // remove all non-digits
  input_val = formatNumber(input_val);
  input_val = "$" + input_val;
  
  // final formatting
  if (blur === "blur") {
    input_val += ".00";
  }
}

// send updated string to input
input.val(input_val);

// put caret back in the right position
var updated_len = input_val.length;
caret_pos = updated_len - original_len + caret_pos;
input[0].setSelectionRange(caret_pos, caret_pos);
}}