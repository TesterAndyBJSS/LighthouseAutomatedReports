module.exports = {
    extends: 'lighthouse:default',
    settings: {
      onlyAudits: [
        'first-meaningful-paint',
        'speed-index',
        'first-cpu-idle',
        'interactive',
      ],
    },
  };
  //This is not being implemeted yet