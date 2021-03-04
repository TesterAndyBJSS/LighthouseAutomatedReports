const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");
const argv = require("yargs").argv;
const url = require("url");
const fs = require("fs");
const glob = require("glob");
const path = require("path");

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

            const log = (() => {
                if (Math.sign(percentageDiff) === 1) {
                    logColor = "\x1b[31m";
                    return `${percentageDiff.toString().replace("-", "") + "%"} slower`;
                } else if (Math.sign(percentageDiff) === 0) {
                    return "unchanged";
                } else {
                    logColor = "\x1b[32m";
                    return `${percentageDiff.toString().replace("-", "") + "%"} faster`;
                }
            })();

            console.log(logColor, `${from["audits"][auditObj].title} is ${log}`);
            console.log(logColor,
                'Was: ' + Math.round((from["audits"][auditObj].numericValue + Number.EPSILON) * 100) / 100,
                '\n Now: ' + Math.round((to["audits"][auditObj].numericValue + Number.EPSILON) * 100) / 100
            );

            console.log("\x1b[37m", '');
        }
    }
};

if (argv.from && argv.to) {
    compareReports(
        getContents(argv.from + ".json"),
        getContents(argv.to + ".json")
    );
} else if (argv.url) {
    const urlObj = new URL(argv.url);
    let dirName = urlObj.host.replace("www.", "");
    if (urlObj.pathname !== "/") {
        dirName = dirName + urlObj.pathname.replace(/\//g, "_");
    }

    if (!fs.existsSync('reports/' + dirName)) 
    {
        if (!fs.existsSync('reports')) 
        {
            fs.mkdirSync('reports')
        }
        fs.mkdirSync('reports/' + dirName);
    }

    launchChromeAndRunLighthouse(argv.url).then(results => {
        const prevReports = glob('reports/' + `${dirName}/*.json`, {
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
                'reports/' + dirName + "/" + recentReport.replace(/:/g, "_") + ".json"
            );

            compareReports(recentReportContents, results.js);
        }

        fs.writeFile(
            `reports/${dirName}/${results.js["fetchTime"].replace(/:/g, "_")}.json`,
            results.json,
            err => {
                if (err) throw err;
            }
        );
    });
} else {
    throw "You haven't passed a URL to Lighthouse, see README";
}