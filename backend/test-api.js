#!/usr/bin/env node

/**
 * Simple Test Script for Project ORION Backend
 * Tests all API endpoints and WebSocket functionality
 */

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  console.log(`\n${'='.repeat(60)}`);
  log(`TEST: ${name}`, 'cyan');
  console.log('='.repeat(60));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testHealthCheck() {
  logTest('Health Check');
  try {
    const response = await axios.get(`${API_URL}/health`);
    log('✅ Health check passed', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log('❌ Health check failed: ' + error.message, 'red');
    return false;
  }
}

async function testRegisterSentinel() {
  logTest('Register Sentinel');
  try {
    const sentinel = {
      deviceId: 'ORN-001',
      location: { lat: 1.3521, lng: 103.8198 },
      batteryLevel: 95,
      ipAddress: '192.168.1.100'
    };
    
    const response = await axios.post(`${API_URL}/sentinels/register`, sentinel);
    log('✅ Sentinel registered successfully', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log('❌ Sentinel registration failed: ' + error.message, 'red');
    return false;
  }
}

async function testGetAllSentinels() {
  logTest('Get All Sentinels');
  try {
    const response = await axios.get(`${API_URL}/sentinels`);
    log(`✅ Retrieved ${response.data.count} sentinels`, 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log('❌ Failed to get sentinels: ' + error.message, 'red');
    return false;
  }
}

async function testCreateAlert() {
  logTest('Create Alert');
  try {
    const alert = {
      sentinelId: 'ORN-001',
      threatType: 'Excavator',
      confidence: 0.95,
      location: { lat: 1.3521, lng: 103.8198 }
    };
    
    const response = await axios.post(`${API_URL}/alerts`, alert);
    log('✅ Alert created successfully', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data.data.alert._id;
  } catch (error) {
    log('❌ Failed to create alert: ' + error.message, 'red');
    return null;
  }
}

async function testGetAllAlerts() {
  logTest('Get All Alerts');
  try {
    const response = await axios.get(`${API_URL}/alerts?limit=5`);
    log(`✅ Retrieved ${response.data.data.length} alerts`, 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log('❌ Failed to get alerts: ' + error.message, 'red');
    return false;
  }
}

async function testGetAlertStats() {
  logTest('Get Alert Statistics');
  try {
    const response = await axios.get(`${API_URL}/alerts/stats`);
    log('✅ Alert statistics retrieved', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log('❌ Failed to get alert stats: ' + error.message, 'red');
    return false;
  }
}

async function testVerifyAlert(alertId) {
  logTest('Verify Alert');
  if (!alertId) {
    log('⚠️  No alert ID provided, skipping', 'yellow');
    return false;
  }
  
  try {
    const response = await axios.patch(
      `${API_URL}/alerts/${alertId}/verify`,
      { isVerified: true }
    );
    log('✅ Alert verified successfully', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log('❌ Failed to verify alert: ' + error.message, 'red');
    return false;
  }
}

function testWebSocket() {
  return new Promise((resolve) => {
    logTest('WebSocket Connection');
    
    const socket = io(BASE_URL, {
      transports: ['websocket', 'polling']
    });
    
    let connected = false;
    
    socket.on('connect', () => {
      log('✅ WebSocket connected successfully', 'green');
      console.log(`Socket ID: ${socket.id}`);
      connected = true;
    });
    
    socket.on('connected', (data) => {
      log('✅ Received connection confirmation from server', 'green');
      console.log(JSON.stringify(data, null, 2));
    });
    
    socket.on('new-alert', (data) => {
      log('🚨 NEW ALERT received via WebSocket!', 'yellow');
      console.log(JSON.stringify(data, null, 2));
    });
    
    socket.on('alert-verified', (data) => {
      log('✅ ALERT VERIFIED notification received!', 'yellow');
      console.log(JSON.stringify(data, null, 2));
    });
    
    socket.on('connect_error', (error) => {
      log('❌ WebSocket connection error: ' + error.message, 'red');
      resolve(false);
    });
    
    // Wait 3 seconds then disconnect
    setTimeout(() => {
      socket.disconnect();
      log('\n🔌 WebSocket disconnected', 'blue');
      resolve(connected);
    }, 3000);
  });
}

async function runAllTests() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
  log('║        PROJECT ORION - Backend API Test Suite           ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════════╝', 'cyan');
  
  log(`\nTesting backend at: ${BASE_URL}\n`, 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Test 1: Health Check
  results.total++;
  if (await testHealthCheck()) results.passed++;
  else results.failed++;
  await sleep(500);
  
  // Test 2: Register Sentinel
  results.total++;
  if (await testRegisterSentinel()) results.passed++;
  else results.failed++;
  await sleep(500);
  
  // Test 3: Get All Sentinels
  results.total++;
  if (await testGetAllSentinels()) results.passed++;
  else results.failed++;
  await sleep(500);
  
  // Test 4: Create Alert
  results.total++;
  const alertId = await testCreateAlert();
  if (alertId) results.passed++;
  else results.failed++;
  await sleep(500);
  
  // Test 5: Get All Alerts
  results.total++;
  if (await testGetAllAlerts()) results.passed++;
  else results.failed++;
  await sleep(500);
  
  // Test 6: Get Alert Stats
  results.total++;
  if (await testGetAlertStats()) results.passed++;
  else results.failed++;
  await sleep(500);
  
  // Test 7: Verify Alert
  results.total++;
  if (await testVerifyAlert(alertId)) results.passed++;
  else results.failed++;
  await sleep(500);
  
  // Test 8: WebSocket
  results.total++;
  if (await testWebSocket()) results.passed++;
  else results.failed++;
  
  // Summary
  console.log('\n\n');
  log('═'.repeat(60), 'cyan');
  log('                    TEST SUMMARY                    ', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  
  console.log(`\nTotal Tests:  ${results.total}`);
  log(`Passed:       ${results.passed}`, 'green');
  log(`Failed:       ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Pass Rate:    ${passRate}%\n`, passRate === '100.0' ? 'green' : 'yellow');
  
  if (results.failed === 0) {
    log('🎉 All tests passed! Backend is working correctly.', 'green');
  } else {
    log('⚠️  Some tests failed. Check the output above for details.', 'yellow');
  }
  
  log('\n═'.repeat(60) + '\n', 'cyan');
  
  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  log('\n❌ Test suite crashed: ' + error.message, 'red');
  console.error(error);
  process.exit(1);
});
