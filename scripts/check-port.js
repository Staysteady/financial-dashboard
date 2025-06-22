#!/usr/bin/env node

const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true); // Port is available
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false); // Port is in use
    });
  });
}

async function main() {
  const targetPort = 3001;
  const conflictPort = 3000;
  
  console.log('🔍 Checking port availability...\n');
  
  const port3000Available = await checkPort(conflictPort);
  const port3001Available = await checkPort(targetPort);
  
  console.log(`Port ${conflictPort}: ${port3000Available ? '✅ Available' : '❌ In use (likely Bloomberg dashboard)'}`);
  console.log(`Port ${targetPort}: ${port3001Available ? '✅ Available' : '❌ In use'}\n`);
  
  if (!port3001Available) {
    console.log('⚠️  Port 3001 is already in use!');
    console.log('Please stop any applications running on port 3001 or choose a different port.\n');
    
    // Check alternative ports
    console.log('Checking alternative ports...');
    for (let port = 3002; port <= 3010; port++) {
      const available = await checkPort(port);
      if (available) {
        console.log(`✅ Port ${port} is available as an alternative`);
        break;
      }
    }
  } else {
    console.log('🎉 Port 3001 is available! You can start the financial dashboard.');
    console.log('\nTo start the application:');
    console.log('  npm run dev');
    console.log('\nThen open: http://localhost:3001');
  }
}

main().catch(console.error);
