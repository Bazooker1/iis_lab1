const width = 1400;
const height = 600;
let marginX = 40;
let marginY = 40;
let svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height);

const country = d3.select("#selectCountry");
country.insert("option", "option").attr("selected", "selected").text("Все страны");

d3.select("#showTable").on('click', function updateTable() {
    let buttonValue = d3.select(this);
    if (buttonValue.property("value") === "Показать таблицу") {
        buttonValue.attr("value", "Скрыть таблицу");
        let table = d3.select("div.table").select("table");

        let rows = table.selectAll("tr")
            .data(fires)
            .enter()
            .append('tr')
            .style("display", "");

        let cells = rows.selectAll("td")
            .data(d => Object.values(d))
            .enter()
            .append("td")
            .text(d => d);

        let head = table.insert("thead", "tr")
            .selectAll("th")
            .data(d => Object.keys(fires[0]))
            .enter()
            .append("th")
            .text(d => d);

    } else {
        buttonValue.attr("value", "Показать таблицу");
        d3.select("div.table")
            .select("table").selectAll("tr, thead").remove();
    }
    createDropDown();
});

function createDropDown() {
    const groupObj = d3.group(fires, d => d.Country);
    const countries = Array.from(groupObj.keys());
    country.selectAll("option").data(countries).enter().append('option').text(d => d);
}

function applyFilter() {
    const selectedCountry = country.property("value");
    const TemperatureOrder = d3.select("#sortByTemperature").property("value");
    const RHOrder = d3.select("#sortByRH").property("value");
    sortTable(TemperatureOrder, RHOrder);
    filterByCountry(selectedCountry);
}

function filterByCountry(value) {
    d3.select("div.table").select("table").selectAll("tr").style("display", "");
    d3.select("div.table").select("table").selectAll("tr")
        .filter(d => (value !== 'Все страны') ? !(d.Country === value) : false)
        .style("display", "none");
}

function getSortFunction(column, order) {
    if (order === "ascending") {
        return (a, b) => a[column] - b[column];
    } else if (order === "descending") {
        return (a, b) => b[column] - a[column];
    } else {
        return null;
    }
}

function sortTable(TemperatureOrder, RHOrder) {
    const table = d3.select("div.table").select("table");
    let rows = table.selectAll("tr").data();

    let temperatureSortFunction = getSortFunction("Temperature", TemperatureOrder);
    let RHSortFunction = getSortFunction("RH", RHOrder);

    if (temperatureSortFunction) {
        rows.sort(temperatureSortFunction);
    }

    if (RHSortFunction) {
        rows.sort(RHSortFunction);
    }

    table.selectAll("tr").remove();
    let updatedRows = table.selectAll("tr")
        .data(rows)
        .enter()
        .append('tr')
        .style("display", "");

    updatedRows.selectAll("td")
        .data(d => Object.values(d))
        .enter()
        .append("td")
        .text(d => d);
}

d3.select("#applyFilter").on("click", applyFilter);

let dataTemp = [];
let index = 0;
let t_index = 1;

while (index < fires.length) {
    const chunk = fires.slice(index, index + 100);
    const data = {
        t: t_index,
        data: chunk.map((fire, chunkIndex) => ({x: chunkIndex, y: Math.abs(parseFloat(fire.Temperature))}))
    };
    dataTemp.push(data);
    index += 100;
    t_index++;
}


console.log(dataTemp[0]);
function createAxes(data) {
    let maxY = d3.max(data.map(d => d.y));

    // Настройка масштабов для осей
    let scaleX = d3.scaleLinear()
        .domain(d3.extent(data.map(d => d.x)))
        .range([0, width - 2 * marginX]);

    let scaleY = d3.scaleLinear()
        .domain([0, maxY]) // Используем максимальное значение оси Y
        .range([height - 2 * marginY, 0]);

    // Создание осей
    let axisX = d3.axisBottom(scaleX);
    let axisY = d3.axisLeft(scaleY);

    // Отрисовка осей в SVG-элементе
    svg.append("g")
        .attr("class", "x axis") // Добавляем класс для оси X
        .attr("transform", `translate(${marginX}, ${height - marginY})`)
        .call(axisX);
    svg.append("g")
        .attr("transform", `translate(${marginX}, ${marginY})`)
        .call(axisY);

    return [scaleX, scaleY];
}


function createPath(scaleX, scaleY) {

    let lineXY = d3.line()
        .x(d => scaleX(d.x))
        .y(d => scaleY(d.y));
    svg.append("path") // добавляем путь
        .attr("id", "graph")
        .attr("transform", `translate(${marginX}, ${marginY})`)
        .style("stroke-width", "3")
        .style("stroke", "red");

    return lineXY;
}

function firstStep(data, line) {
    const firstPath = svg
        .select("path#graph")
        .datum(data)
        .attr("d", line);

    const pathLength = firstPath.node().getTotalLength();

    firstPath
        .attr("stroke-dashoffset", pathLength * 2)
        .attr("stroke-dasharray", `${pathLength * 2}, ${pathLength * 2}`)
        .transition()
        .ease(d3.easeLinear)
        .duration(2000)
        .attr("stroke-dashoffset", 0);
}

let currentIndex = 0;
let [scaleX, scaleY] = createAxes(dataTemp[0].data);
let lineXY = createPath(scaleX, scaleY);
firstStep(dataTemp[0].data, lineXY);

d3.select("#start")
    .on('click', () => {
        currentIndex = 0;
        svg.selectAll("g").remove();
        [scaleX, scaleY] = createAxes(dataTemp[0].data);
        lineXY = createPath(scaleX, scaleY);
        firstStep(dataTemp[0].data, lineXY);
    });

d3.select("#step")
    .on('click', () => {
        if (currentIndex >= dataTemp.length - 1) return;
        currentIndex++;
        // Удаляем старые оси
        svg.selectAll("g").remove();
        // Создаем новые оси и обновляем их максимальные значения
        [scaleX, scaleY] = createAxes(dataTemp[currentIndex].data);
        lineXY = createPath(scaleX, scaleY);
        update(dataTemp[currentIndex].data, lineXY);
    });

// Функция для рекурсивного выполнения всех шагов
let runAllSteps = () => {
    // Проверяем, достигли ли мы последнего шага
    if (currentIndex >= dataTemp.length - 1) return;
    currentIndex++;
    // Удаляем старые оси
    svg.selectAll("g").remove();
    // Создаем новые оси и обновляем их максимальные значения
    [scaleX, scaleY] = createAxes(dataTemp[currentIndex].data);
    lineXY = createPath(scaleX, scaleY);
    update(dataTemp[currentIndex].data, lineXY, runAllSteps);
};

// Обработчик события для кнопки "all"
d3.select("#all").on('click', () => {
    currentIndex = -1;
    // Начинаем выполнение всех шагов с индекса 0
    runAllSteps();
});

function update(data, line, callback, time = 1000) {
    svg.select("path#graph")
        .datum(data)
        .transition()
        .duration(time)
        .ease(d3.easeLinear)
        .attr("d", line)
        .on("end", callback);
}

document.addEventListener("DOMContentLoaded", function() {
    createDropDown();
});
