# Vision Mode Enhanced Regression Test Matrix

## Test Execution Protocol

1. **Baseline Capture**: Run all tests on current system before changes
2. **Progressive Testing**: Run tests after each Tier 1 fix
3. **Regression Monitoring**: Ensure VM-009 (music pipeline) remains green
4. **Metric Collection**: Track duration accuracy, pacing compliance, JSON stability

## Test Cases

| Test ID | Test Name | Input Scenario | Expected Behavior | Priority | Status |
|---------|-----------|----------------|-------------------|----------|---------|
| VM-001 | Duration Extreme (Short) | 10-second fast-paced action | Duration: 9.5-10.5s, Cuts: 5-10 | HIGH | Pending |
| VM-002 | Duration Extreme (Long) | 90-second contemplative doc | Duration: 85.5-94.5s, Cuts: 9-15 | HIGH | Pending |
| VM-003 | Pacing Mismatch | 15s contemplative (conflicting) | Duration exact, Cuts: 2-3 only | CRITICAL | Pending |
| VM-004 | Malformed JSON Recovery | Director returns invalid JSON | DoP receives raw content, continues | CRITICAL | Pending |
| VM-005 | Educational Content | 30s recipe tutorial | Clear steps, ingredients list, 30s ±5% | HIGH | Pending |
| VM-006 | Character Consistency | Multi-character narrative | Same characters throughout, consistent appearance | MEDIUM | Pending |
| VM-007 | No Narration Request | Visual-only content | No TTS generation, visual storytelling only | MEDIUM | Pending |
| VM-008 | Rapid Cuts Override | User requests 5s minimum shots | All shots ≥5s despite "dynamic" pacing | HIGH | Pending |
| VM-009 | Music Pipeline Integrity | Music video with beats | Existing music pipeline unaffected | CRITICAL | Pending |
| VM-010 | Vision Agent Validation | Invalid user input | Graceful error handling, clear feedback | LOW | Pending |

## Success Criteria

- **Duration Accuracy**: ≥95% of tests within ±5% of requested duration
- **Pacing Compliance**: ≥90% correct pacing interpretation
- **JSON Stability**: 0 complete pipeline failures due to JSON errors
- **User Requirements**: ≥90% of explicit requirements honored
- **No Regressions**: All existing pipelines maintain current functionality

## Risk Scenarios

- **Edge Case**: 5-second video with contemplative pacing (impossible constraint)
- **Stress Test**: 50+ rapid cuts in 60 seconds
- **Error Cascade**: Multiple agents return malformed JSON in sequence
- **Content Type Switch**: Mid-pipeline content type change request

## Test Data Templates

### VM-001: Duration Extreme (Short)
```json
{
  "concept": "Lightning strikes in slow motion",
  "duration": 10,
  "pacing": "fast",
  "style": "cinematic",
  "contentType": "general"
}
```

### VM-003: Pacing Mismatch
```json
{
  "concept": "Meditation in nature",
  "duration": 15,
  "pacing": "contemplative",
  "style": "minimal",
  "contentType": "abstract"
}
```

### VM-005: Educational Content
```json
{
  "concept": "How to make perfect scrambled eggs",
  "duration": 30,
  "pacing": "moderate",
  "style": "documentary",
  "contentType": "educational"
}
```

## Monitoring Dashboard Metrics

1. **Duration Compliance Rate**: Current: 20% → Target: 95%
2. **Pacing Accuracy**: Current: 0% → Target: 90%
3. **JSON Parse Success**: Current: 40% → Target: 100%
4. **User Requirement Match**: Current: 30% → Target: 90%
5. **Pipeline Completion Rate**: Current: 60% → Target: 95%