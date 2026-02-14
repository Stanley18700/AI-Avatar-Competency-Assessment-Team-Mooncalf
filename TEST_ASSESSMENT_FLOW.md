# NurseMind AI - Assessment Flow Test Guide

## Overview
This guide helps you test the complete nurse assessment flow from start to finish.

## Prerequisites
- Backend server running on http://localhost:3001
- Frontend server running on http://localhost:5173
- Database seeded with test data
- Gemini API key configured in `.env`

## Test Flow

### Step 1: Login as Nurse
1. Open http://localhost:5173
2. Click "Nurse 1" button (or use credentials: `nurse1@nursemind.ai` / `password123`)
3. You should be redirected to the Dashboard

### Step 2: Start New Assessment
1. Navigate to "My Assessments" (การประเมินของฉัน)
2. Click "Start New Assessment" button
3. You'll see a list of available case scenarios
4. Select a case (e.g., "Post-operative Patient Deterioration")
5. Click "Start" to begin the assessment

### Step 3: Self-Assessment
1. You'll see AI-assessed competency criteria grouped by category:
   - **Functional Competency** (4 criteria)
   - **Specific Competency** (2 criteria)  
   - **Managerial Competency** (5 criteria)
2. For each criterion, rate yourself on a 1-5 scale:
   - 1 = Novice (ระดับเริ่มต้น)
   - 2 = Beginner (ระดับเริ่มเรียนรู้)
   - 3 = Competent (ระดับมีความสามารถ)
   - 4 = Proficient (ระดับชำนาญ)
   - 5 = Expert (ระดับเชี่ยวชาญ)
3. You'll also see the standard score for your experience level
4. Click "Next: Answer Case Study →" when complete

### Step 4: Answer Case Scenario
1. Read the case scenario carefully (displayed in Thai)
2. In the text area, provide a detailed response explaining:
   - How you would assess the patient (ABCDE approach)
   - Immediate interventions you would take
   - How you would communicate with the healthcare team
   - Your continuing care plan
3. Write at least 200-300 words for meaningful AI evaluation
4. Click "Submit Response" (ส่งคำตอบ)

### Step 5: AI Evaluation (Automatic)
1. You'll see a loading screen: "AI กำลังวิเคราะห์..."
2. The system will:
   - Send your response to Gemini AI
   - AI evaluates your answer against all 11 criteria
   - AI provides scores, strengths, weaknesses, and recommendations
   - Results are stored in the database
3. **This may take 10-30 seconds** depending on response complexity

### Step 6: View Results
Once AI evaluation completes, you'll see:
1. **Score Table** showing:
   - Standard Level (for your experience level)
   - Your Self Score
   - AI Score
   - Final Score
   - GAP (difference from standard)
2. **Overall Weighted Score** (out of 5.00)
3. **AI Feedback**:
   - Strengths (จุดแข็ง)
   - Weaknesses (จุดอ่อน)
   - Recommendations (คำแนะนำ)

### Step 7: Reviewer Review (Different Login)
1. Logout and login as Reviewer (`reviewer@nursemind.ai` / `password123`)
2. Navigate to "Pending Reviews" (รอการตรวจสอบ)
3. You'll see all AI-scored assessments
4. Click on an assessment to review it
5. You'll see:
   - Nurse's response (transcript)
   - AI scores and feedback
   - Self-assessment scores
6. Reviewer can:
   - Adjust any AI scores if needed
   - Add reviewer feedback
   - Approve the assessment
7. Click "Save" to update scores
8. Click "Approve" to finalize the assessment

## Expected Result
✅ Assessment status should progress through:
- `IN_PROGRESS` → Self-assessment step
- `SELF_ASSESSED` → After submitting self scores
- `AI_SCORED` → After AI evaluation completes
- `REVIEWED` → After reviewer edits scores
- `APPROVED` → After reviewer approval

## Common Issues & Solutions

### Issue: AI evaluation fails
**Symptoms**: Status changes to `AI_FAILED`
**Solutions**:
- Check backend console logs for detailed error messages
- Verify Gemini API key is correct and active
- Ensure response text is not empty
- Check internet connection for API calls
- Look for JSON parsing errors in logs

### Issue: No competency criteria shown
**Symptoms**: Empty list during self-assessment
**Solutions**:
- Verify database is seeded: `npm run seed` in server directory
- Check that `assessedByAI: true` for criteria groups
- Look for API errors in browser console

### Issue: Scores not displaying correctly
**Symptoms**: Scores show as "-" or undefined
**Solutions**:
- Check that AI response includes all expected criteria IDs
- Verify standardLevels are properly set for the nurse's experience level
- Check JSON parsing in criteriaScores

## Testing with API Calls

You can also test the backend directly using PowerShell:

```powershell
# Login
$token = (Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body '{"email":"nurse1@nursemind.ai","password":"password123"}' -ContentType "application/json").token

# Start assessment
$assessment = Invoke-RestMethod -Uri "http://localhost:3001/api/assessments/start" -Method POST -Body '{"caseId":"<CASE_ID>"}' -ContentType "application/json" -Headers @{Authorization="Bearer $token"}

# Submit response (this triggers AI evaluation)
Invoke-RestMethod -Uri "http://localhost:3001/api/assessments/$($assessment.id)/submit" -Method POST -Body '{"text":"Your detailed response here...", "inputType":"TEXT"}' -ContentType "application/json" -Headers @{Authorization="Bearer $token"}

# Check results
Invoke-RestMethod -Uri "http://localhost:3001/api/assessments/$($assessment.id)" -Headers @{Authorization="Bearer $token"} | ConvertTo-Json -Depth 5
```

## Success Criteria
✅ Nurse can start assessment
✅ Self-assessment scores are saved
✅ Case response can be submitted
✅ AI evaluation completes successfully
✅ AI scores are visible and accurate (11 criteria)
✅ Strengths, weaknesses, recommendations are in Thai
✅ Reviewer can see and edit assessment
✅ Reviewer can approve assessment
✅ GAP calculation is correct
✅ Version history tracks all changes

## Performance Expectations
- Self-assessment: Instant
- Response submission: < 1 second
- AI evaluation: 10-30 seconds
- Results loading: < 1 second
- Reviewer actions: < 1 second

## Debug Mode
To see detailed logs, open browser DevTools Console (F12) and check:
- Network tab for API calls
- Console for JavaScript errors
- Check backend terminal for server logs

Backend logs will show:
```
[Assessment <ID>] Found N AI-assessed criteria
[Assessment <ID>] Starting AI evaluation with N reasoning indicators
[Gemini] Evaluating N criteria for case: <title>
[Gemini] Attempt 1: Received response (length: XXX)
[Gemini] Successfully parsed and validated. Got N scores
[Assessment <ID>] AI evaluation successful. Scored N criteria
```

---

## Need Help?
If you encounter issues:
1. Check both frontend and backend console logs
2. Verify all environment variables are set
3. Ensure database is properly seeded
4. Test API endpoints directly
5. Check Gemini API quota and rate limits
