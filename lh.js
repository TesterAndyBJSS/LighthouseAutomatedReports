const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const argv = require("yargs").argv;
const url = require("url");
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const { run } = require("lighthouse/lighthouse-core/runner");
const G = require("glob");
const { sync } = require("glob");
const averageObject = { was: [], now: [] }
var dirName;


const launchChromeAndRunLighthouse = url => {

    return chromeLauncher.launch().then(chrome => {
        const opts = {
            port: chrome.port,
            onlyCategories: ['performance'],
        };
        return lighthouse(url, opts).then(results => {

            return chrome.kill().then(() => {
                return {
                    js: results.lhr,
                    json: results.report
                };
            });
        });
    });
};

const getContents = pathStr => {
    const output = fs.readFileSync(pathStr, "utf8", (err, results) => {
        return results;

    });
    return JSON.parse(output);
};

const compareReports = (from, to) => {

    //Filter for required audits - change this is needed
    const metricFilter = [
        "first-contentful-paint",
        "largest-contentful-paint",
        "cumulative-layout-shift",
        "total-blocking-time",
        "interactive"
    ];

    const calcPercentageDiff = (from, to) => {
        const per = ((to - from) / from) * 100;
        return Math.round(per * 100) / 100;
    };

    for (let auditObj in from["audits"]) {

        if (metricFilter.includes(auditObj)) {
            const percentageDiff = calcPercentageDiff(
                from["audits"][auditObj].numericValue,
                to["audits"][auditObj].numericValue
            );

            var nowRead;
            var fromRead;
            var title;


            const log = displayHelper(percentageDiff);
            fromRead = (Math.round((from["audits"][auditObj].numericValue + Number.EPSILON) * 100) / 100)
            nowRead = (Math.round((to["audits"][auditObj].numericValue + Number.EPSILON) * 100) / 100)
            title = (`${from["audits"][auditObj].title} is ${log}`)

            if (!argv.average) {
                console.log(logColor, title);
                console.log(logColor, 'Was: ' + fromRead);
                console.log(logColor, 'Now: ' + nowRead);
                console.log("\x1b[37m", '');
            }

            averageObject.was.push(fromRead);
            averageObject.now.push(nowRead);

            fs.appendFile("runLogResults.json", title + '\n' + fromRead + '\n' + nowRead + '\n', err => {
                if (err) throw err;
            });
        }
    }
};

const runCheck = () => {
    const urlObj = new URL(argv.url);
    dirName = urlObj.host.replace("www.", "");
    if (urlObj.pathname !== "/") {
        dirName = dirName + urlObj.pathname.replace(/\//g, "_");
    }

    if (!fs.existsSync('reports/' + dirName + '/single/')) {
        if (!fs.existsSync('reports')) {
            fs.mkdirSync('reports')
        }
        if (!fs.existsSync('reports/' + dirName)) {
            fs.mkdirSync('reports/' + dirName)
        }
        if (!fs.existsSync('reports/' + dirName + '/single/')) {
            fs.mkdirSync('reports/' + dirName + '/single/')
        }
    }

    if (argv.average && !fs.existsSync('reports/' + dirName + '/average')) {
        fs.mkdirSync('reports/' + dirName + '/average')

    }

    launchChromeAndRunLighthouse(argv.url).then(results => {
        const prevReports = glob('reports/' + `${dirName}/single/*.json`, {
            sync: true
        });

        if (prevReports.length) {
            dates = [];
            for (report in prevReports) {
                dates.push(
                    new Date(path.parse(prevReports[report]).name.replace(/_/g, ":"))
                );
            }
            const max = dates.reduce(function (a, b) {
                return Math.max(a, b);
            });
            const recentReport = new Date(max).toISOString();

            const recentReportContents = getContents(
                'reports/' + dirName + "/single/" + recentReport.replace(/:/g, "_") + ".json"
            );

            compareReports(recentReportContents, results.js);
        }

        else {
            compareReports(results.js, results.js)
        }

        fs.writeFile(
            `reports/${dirName}/single/${results.js["fetchTime"].replace(/:/g, "_")}.json`,
            results.json,
            err => {
                if (err) throw err;
            }
        );
    });
};

let average = [1, 2, 3]
runAverage = async () => {
    for (const run of average) {
        await new Promise(resolve => setTimeout(resolve, 40000)).then(runCheck());
    }
    displayAverage();
};


if (argv.from && argv.to) {
    compareReports(
        getContents(argv.from + ".json"),
        getContents(argv.to + ".json")
    );
}
else if (argv.url) {
    if (argv.average) {
        runAverage();
        console.log('\x1b[33m', '');
        console.log('\x1b[33m', '...... ...... ...... ...... ');
        console.log('\x1b[33m', 'Running Average report .... ');
        console.log('\x1b[33m', 'Please hold .... ..... .... ');
        console.log('\x1b[33m', '...... ...... ...... ...... ');

    }
    else {
        runCheck();
        console.log('\x1b[33m', '');
        console.log('\x1b[33m', '...... ...... ...... ...... ');
        console.log('\x1b[33m', 'Running one off report .... ');
        console.log('\x1b[33m', '...... ...... ...... ...... ');

    }
}

else {
    throw "You haven't passed a URL to Lighthouse, see README";
}

function displayHelper(percentageDiff) {
    return (() => {
        if (Math.sign(percentageDiff) === 1) {
            logColor = "\x1b[31m";
            return `${percentageDiff.toString().replace("-", "") + "%"} decrease`;
        } else if (Math.sign(percentageDiff) === 0) {
            return "unchanged";
        } else {
            logColor = "\x1b[32m";
            return `${percentageDiff.toString().replace("-", "") + "%"} increase`;
        }
    })();
}

displayAverage = async () => {

    const averageChangeNow = { fcp: 0, lcp: 0, tbt: 0, cls: 0, tti: 0 };
    var recentReportPathStr;
    var recentAverageReport;
    averageChangeNow.fcp = ((averageObject.now[0] + averageObject.now[5] + averageObject.now[10]) / 3);
    averageChangeNow.lcp = ((averageObject.now[1] + averageObject.now[6] + averageObject.now[11]) / 3);
    averageChangeNow.tbt = ((averageObject.now[2] + averageObject.now[7] + averageObject.now[12]) / 3);
    averageChangeNow.cls = ((averageObject.now[3] + averageObject.now[8] + averageObject.now[13]) / 3);
    averageChangeNow.tti = ((averageObject.now[4] + averageObject.now[9] + averageObject.now[14]) / 3);

    const prevAverageReports = glob('reports/' + `${dirName}/average/*.json`, {
        sync: true
    });

    if (prevAverageReports.length) {
        dates = [];
        for (report in prevAverageReports) {

            var dateParts = prevAverageReports[report].replace(dirName, '').replace('reports//average/', '');

            var timeOfReport = prevAverageReports[report].split(',')[1];
            timeOfReport = timeOfReport.split('.')[0].replace(/_/g, ':')
            dateParts = dateParts.split('_');
            dateParts[0] = dateParts[0].replace('/', '');
            dateParts[2] = dateParts[2].split(',')[0];

            var formattedTime = (dateParts[2] + '-' + dateParts[1].toString() + '-' + dateParts[0]) + 'T' + timeOfReport
            var dateObject = new Date(formattedTime);

            dates.push(
                new Date(dateObject)
            );
        }

        const maxAverage = dates.reduce(function (a, b) {
            return Math.max(a, b);
        });
        recentAverageReport = new Date(maxAverage).toLocaleString();
        recentReportPathStr = 'reports/' + dirName + "/average/" + recentAverageReport.replace(' ', '').replace(/:/g, "_").replace(/\//g, "_") + ".json";
        const readRecentAverageReport = getContents(recentReportPathStr);

        var nowValues = {};


        let average = 0;
        const calcPercentageDiff = (from, to) => {
            const per = ((to - from) / from) * 100;
            return Math.round(per * 100) / 100;
        };



        nowValues = Object.entries(averageChangeNow)


        console.log("\x1b[37m", '');
        console.log('Average for FCP was: ' + Math.round(((readRecentAverageReport.fcp + Number.EPSILON) * 100) / 100) / 1000 + ' seconds');
        console.log('Average for FCP now: ' + Math.round(((averageChangeNow.fcp + Number.EPSILON) * 100) / 100) / 1000 + ' seconds');
        average = displayHelper((calcPercentageDiff(readRecentAverageReport.fcp, averageChangeNow.fcp)))
        console.log(logColor, 'Changed: ' + average)

        console.log("\x1b[37m", '');
        console.log('Average for LCP was: ' + Math.round(((readRecentAverageReport.lcp + Number.EPSILON) * 100) / 100) / 1000 + ' seconds');
        console.log('Average for LCP now: ' + Math.round(((averageChangeNow.lcp + Number.EPSILON) * 100) / 100) / 1000 + ' seconds')
        average = displayHelper((calcPercentageDiff(readRecentAverageReport.lcp, averageChangeNow.lcp)))
        console.log(logColor, 'Changed: ' + average)

        console.log("\x1b[37m", '');
        console.log('Average for TBT was: ' + Math.round(readRecentAverageReport.tbt * 100) / 100 + ' ms');
        console.log('Average for TBT now: ' + Math.round(averageChangeNow.tbt * 100) / 100 + ' ms');
        average = displayHelper((calcPercentageDiff(readRecentAverageReport.tbt, averageChangeNow.tbt)))
        console.log(logColor, 'Changed: ' + average)

        console.log("\x1b[37m", '');
        console.log('Average for CLS was: ' + Math.round(readRecentAverageReport.cls) / 100);
        console.log('Average for CLS now: ' + Math.round(averageChangeNow.cls * 100) / 100);
        average = displayHelper((calcPercentageDiff(readRecentAverageReport.cls, averageChangeNow.cls)))
        console.log(logColor, 'Changed: ' + average)

        console.log("\x1b[37m", '');
        console.log('Average for TTI was: ' + Math.round(((readRecentAverageReport.tti + Number.EPSILON) * 100) / 100) / 1000 + ' seconds');
        console.log('Average for TTI now: ' + Math.round(((averageChangeNow.tti + Number.EPSILON) * 100) / 100) / 1000 + ' seconds');
        average = displayHelper((calcPercentageDiff(readRecentAverageReport.tti, averageChangeNow.tti)))
        console.log(logColor, 'Changed: ' + average)

    }
    else {
        console.log('\x1b[33m', '');
        console.log('\x1b[33m', "First Average run for this URL")
        console.log('\x1b[33m', "Nothing to compare with - the next run will run comparison to this")
        console.log('\x1b[33m', '...... ...... ...... ...... ');
        console.log('\x1b[37m', 'Average for FCP: ' + Math.round(((averageChangeNow.fcp + Number.EPSILON) * 100) / 100) / 1000 + ' seconds');
        console.log('\x1b[37m', 'Average for LCP: ' + Math.round(((averageChangeNow.lcp + Number.EPSILON) * 100) / 100) / 1000 + ' seconds')
        console.log('\x1b[37m', 'Average for TBT: ' + Math.round(averageChangeNow.tbt * 100) / 100 + ' ms');
        console.log('\x1b[37m', 'Average for CLS: ' + Math.round(averageChangeNow.cls * 100) / 100);
        console.log('\x1b[37m', 'Average for TTI: ' + Math.round(((averageChangeNow.tti + Number.EPSILON) * 100) / 100) / 1000 + ' seconds');
    }

    var currentDateTime = new Date();
    fs.writeFile(
        `reports/${dirName}/average/${currentDateTime.toLocaleString().replace(/:/g, "_").replace(/\//g, "_").replace(' ', '')}.json`,
        JSON.stringify(averageChangeNow)
        ,
        err => {
            if (err) throw err;
        }
    );
    console.log("\x1b[37m", '');

}