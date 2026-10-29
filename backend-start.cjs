import('node:url')
  .then(() => import('./backend/start.js'))
  .catch((error) => {
    console.error('Failed to start YHO News:', error);
    process.exitCode = 1;
  });