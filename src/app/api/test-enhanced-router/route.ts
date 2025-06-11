import { NextResponse } from 'next/server';
import { testScenarios } from '@/test/testEnhancedRouter';

export async function POST() {
  console.log('🧪 Running Enhanced Pipeline Router Tests\n');
  
  const results = [];
  const baseUrl = process.env.SITE_URL || 'http://localhost:3000';
  
  for (const scenario of testScenarios) {
    console.log(`\n📋 Testing: ${scenario.name}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/pipeline-router-enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: scenario.conversation
        })
      });
      
      const result = await response.json();
      
      if (result.error) {
        results.push({ 
          scenario: scenario.name, 
          success: false, 
          error: result.error 
        });
        continue;
      }
      
      const pipeline = result.routing_decision?.pipeline;
      const confidence = result.analysis?.confidence;
      const clarificationNeeded = result.analysis?.clarification_needed || [];
      
      // Check if result matches expected
      let success = false;
      if (scenario.expectedPipeline) {
        success = pipeline === scenario.expectedPipeline;
      } else if (scenario.needsClarification) {
        success = clarificationNeeded.length > 0;
      }
      
      results.push({
        scenario: scenario.name,
        success,
        pipeline,
        confidence,
        expected: scenario.expectedPipeline,
        clarificationNeeded,
        reasoning: result.analysis?.reasoning
      });
      
    } catch (error) {
      results.push({ 
        scenario: scenario.name, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Summary
  const passed = results.filter(r => r.success).length;
  
  return NextResponse.json({
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed
    },
    results
  });
}