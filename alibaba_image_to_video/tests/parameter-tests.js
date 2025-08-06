// This file is intended for more granular unit tests of the parameter configurations.
// For now, the main test logic is in src/main.js.

const assert = require('assert');
const configManager = require('../src/configManager');

console.log('--- Running Parameter Configuration Tests ---');

// Test case 1: Merging with 'FAST' preset
const fastConfig = configManager.mergeWithDefaults({ model: 'wan2.1-i2v-turbo' }, 'FAST');
assert.strictEqual(fastConfig.resolution, '480P', 'Test Case 1 Failed: Resolution should be 480P');
assert.strictEqual(fastConfig.inference_steps, 20, 'Test Case 1 Failed: Inference steps should be 20');
assert.strictEqual(fastConfig.model, 'wan2.1-i2v-turbo', 'Test Case 1 Failed: Model should be wan2.1-i2v-turbo');
console.log('Test Case 1 Passed: FAST preset merged correctly.');

// Test case 2: Merging with 'HIGH_QUALITY' preset and overriding a value
const hqConfig = configManager.mergeWithDefaults({ frames_per_second: 24 }, 'HIGH_QUALITY');
assert.strictEqual(hqConfig.resolution, '1080P', 'Test Case 2 Failed: Resolution should be 1080P');
assert.strictEqual(hqConfig.frames_per_second, 24, 'Test Case 2 Failed: FPS should be 24');
console.log('Test Case 2 Passed: HIGH_QUALITY preset merged and overridden correctly.');

// Test case 3: Using default BALANCED preset
const balancedConfig = configManager.mergeWithDefaults();
assert.strictEqual(balancedConfig.resolution, '720P', 'Test Case 3 Failed: Resolution should be 720P');
console.log('Test Case 3 Passed: BALANCED preset used correctly.');

console.log('--- Parameter Configuration Tests Finished ---');
