# Authenticated Security Questions Management API

This document describes the authenticated endpoints for managing security questions after a user is logged in. These endpoints require a valid JWT token and allow users to update, add, or delete their security questions.

## 🔐 Authentication Required

All endpoints in this document require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📋 Available Endpoints

### 1. Update Security Question Answers Only

**Endpoint:** `PUT /api/security-questions/update-answers`

**Description:** Updates only the answers to existing security questions while keeping the same questions.

**Request Body:**
```json
{
  "answers": ["New Answer 1", "New Answer 2", "New Answer 3"]
}
```

**Example Request:**
```bash
PUT http://localhost:3000/api/security-questions/update-answers
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "answers": ["Fluffy", "Main Street", "New York"]
}
```

**Success Response (200):**
```json
{
  "message": "Security question answers updated successfully",
  "questions": [
    {
      "id": 1,
      "user_id": 123,
      "predefined_question_id": 1,
      "question": "What was the name of your first pet?",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T12:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `400` - Answer count mismatch or invalid input
- `404` - No security questions found
- `401` - Unauthorized (invalid token)

---

### 2. Add New Security Questions

**Endpoint:** `POST /api/security-questions/add`

**Description:** Adds new security questions to existing ones. Cannot exceed total of 5 questions.

**Request Body:**
```json
{
  "questions": [
    {
      "predefined_question_id": 3,
      "answer": "Smith"
    },
    {
      "predefined_question_id": 4,
      "answer": "Lincoln Elementary"
    }
  ]
}
```

**Example Request:**
```bash
POST http://localhost:3000/api/security-questions/add
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "questions": [
    {
      "predefined_question_id": 3,
      "answer": "Smith"
    },
    {
      "predefined_question_id": 4,
      "answer": "Lincoln Elementary"
    }
  ]
}
```

**Success Response (201):**
```json
{
  "message": "Security questions added successfully",
  "questions": [
    {
      "id": 1,
      "user_id": 123,
      "predefined_question_id": 1,
      "question": "What was the name of your first pet?",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "user_id": 123,
      "predefined_question_id": 3,
      "question": "What was your mother's maiden name?",
      "created_at": "2025-01-15T12:00:00.000Z",
      "updated_at": "2025-01-15T12:00:00.000Z"
    }
  ],
  "addedCount": 2,
  "totalCount": 2
}
```

**Error Responses:**
- `400` - Too many questions, duplicate questions, or invalid input
- `401` - Unauthorized (invalid token)

---

### 3. Delete Specific Security Questions

**Endpoint:** `DELETE /api/security-questions/delete`

**Description:** Deletes specific security questions by their IDs. Must leave at least 1 question remaining.

**Request Body:**
```json
{
  "questionIds": [1, 3]
}
```

**Example Request:**
```bash
DELETE http://localhost:3000/api/security-questions/delete
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "questionIds": [1, 3]
}
```

**Success Response (200):**
```json
{
  "message": "Security questions deleted successfully",
  "questions": [
    {
      "id": 2,
      "user_id": 123,
      "predefined_question_id": 2,
      "question": "What was the name of the street you grew up on?",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "deletedCount": 2,
  "remainingCount": 1
}
```

**Error Responses:**
- `400` - Cannot delete all questions, invalid question IDs
- `404` - No security questions found
- `401` - Unauthorized (invalid token)

---

## 🔄 Complete Management Flow

### Step 1: Get Current Questions
```bash
GET http://localhost:3000/api/security-questions/user-questions
Authorization: Bearer <your-jwt-token>
```

### Step 2: Update Answers Only
```bash
PUT http://localhost:3000/api/security-questions/update-answers
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "answers": ["New Answer 1", "New Answer 2"]
}
```

### Step 3: Add More Questions
```bash
POST http://localhost:3000/api/security-questions/add
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "questions": [
    {
      "predefined_question_id": 5,
      "answer": "My Nickname"
    }
  ]
}
```

### Step 4: Delete Unwanted Questions
```bash
DELETE http://localhost:3000/api/security-questions/delete
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "questionIds": [2]
}
```

## 🛡️ Security Features

1. **Authentication Required** - All endpoints require valid JWT token
2. **User Isolation** - Users can only manage their own questions
3. **Validation** - All inputs are validated with helpful error messages
4. **Minimum Questions** - Always maintains at least 1 security question
5. **Maximum Questions** - Cannot exceed 5 total questions
6. **No Duplicates** - Cannot add questions already set up
7. **Predefined Only** - Only allows predefined question IDs

## 🎯 Use Cases

- **Change Answers:** User wants to update their answers without changing questions
- **Add Security:** User wants to add more security questions for better protection
- **Remove Questions:** User wants to remove questions they no longer want to use
- **Complete Overhaul:** User can delete all and set up new ones using existing endpoints

## 📝 Validation Rules

### Update Answers
- Must provide exact number of answers matching current questions
- Each answer must be at least 2 characters long
- Answers are provided as an array of strings

### Add Questions
- Can add 1-5 questions at once
- Total questions cannot exceed 5
- Cannot add duplicate questions
- Must use valid predefined question IDs
- Each answer must be at least 2 characters long

### Delete Questions
- Must provide array of question IDs to delete
- Cannot delete all questions (must leave at least 1)
- Can only delete questions belonging to the authenticated user
- Question IDs must be valid numbers

## 🚨 Error Handling

All endpoints include comprehensive error handling with user-friendly messages:

- **400 Bad Request** - Invalid input, validation errors
- **401 Unauthorized** - Missing or invalid JWT token
- **404 Not Found** - No security questions found
- **500 Internal Server Error** - Server-side errors

Error responses include detailed messages explaining what went wrong and how to fix it.

## 📚 Related Endpoints

- `GET /api/security-questions/predefined-questions` - Get available predefined questions
- `GET /api/security-questions/user-questions` - Get user's current questions
- `POST /api/security-questions/setup` - Initial setup of security questions
- `PUT /api/security-questions/update` - Complete replacement of security questions
