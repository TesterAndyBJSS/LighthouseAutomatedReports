A Tool that will compare google lighthouse reports

###
Required Set up:

Built on Node version v15.8.0, you may need to npm to latest version if you have issues running.

```
npm install 
```

###

Each time a new URL is provided a report is ran and saved to the local directory. 

Two ways to use this script

## 1) Provide one url for a new lighthouse report

```
node lh.js --url https://www.specsavers.co.uk/glasses/marc-jacobs-01?sku=30768628
``` 

This simply runs a report on the given URL, if this is the first time it has ran then it doesn't have anything to compare to.
Each subsequent run will compare to this most recent and provide comparrison stats this way.
##

## 2) Provide one url to run an Average report
This takes slightly longer as requires running multiple reports

```
node lh.js --average --url https://www.specsavers.co.uk/glasses/marc-jacobs-01?sku=30768628
```

This simply runs an Average report on the given URL, if this is the first time it has ran then it doesn't have anything to compare to.
Each subsequent run will compare to this most recent and provide comparrison stats this way.
##

## 3) Compare two previously ran reports

```
node lh.js --from specsavers.co.uk_glasses_marc-jacobs-01/2021-03-01T12_45_45.478Z --to specsavers.co.uk_glasses_marc-jacobs-01/2021-03-01T14_14_22.493Z
```

As you continue to use this tool you may want to compare two previously ran reports. We can do this by using the --from and --to args as seen
##

If for whatever reason you need to change what metrics are captured. You can change this in lh.js

```
    //Filter for required audits - change this is needed
    const metricFilter = [
        "first-contentful-paint",
        "largest-contentful-paint",
        "cumulative-layout-shift",
        "total-blocking-time",
        "interactive"
    ];
```
