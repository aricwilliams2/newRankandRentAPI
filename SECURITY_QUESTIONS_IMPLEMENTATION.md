# Security Questions Implementation

This document describes the implementation of a security questions system for password changes in the Rank and Rent API.

## Overview

The security questions system allows users to:
1. Set up security questions during account setup or later
2. Change their password by answering security questions
3. Choose from predefined security questions stored in the database
4. Update their security questions as needed

**Important:** Users can ONLY choose from predefined security questions. Custom questions are not allowed for security reasons.

## Database Schema

### Predefined Questions Table

```sql
CREATE TABLE predefined_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(500) NOT NULL UNIQUE,
  category VARCHAR(100) DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_is_active (is_active)
);
```

### Security Questions Table

```sql
CREATE TABLE security_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  predefined_question_id INT NOT NULL,
  answer_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (predefined_question_id) REFERENCES predefined_questions(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_predefined_question_id (predefined_question_id),
  INDEX idx_created_at (created_at),
  UNIQUE KEY unique_user_question (user_id, predefined_question_id)
);
```

### Predefined Questions Data

The system comes with 10 predefined security questions:

1. "What was the name of your first pet?" (childhood)
2. "What was the name of the street you grew up on?" (childhood)
3. "What was your mother's maiden name?" (family)
4. "What was the name of your elementary school?" (education)
5. "What was your childhood nickname?" (childhood)
6. "What was the make of your first car?" (personal)
7. "What was your favorite teacher's name?" (education)
8. "What city were you born in?" (personal)
9. "What was your favorite food as a child?" (childhood)
10. "What was the name of your first employer?" (work)

## API Endpoints

### 1. Get Predefined Security Questions
**GET** `/api/security-questions/predefined-questions`

Returns a list of predefined security questions that users can choose from.

**Response:**
```json
{
  "message": "Predefined security questions retrieved successfully",
  "questions": [
    {
      "id": 1,
      "question": "What was the name of your first pet?",
      "category": "childhood",
      "is_active": true,
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "question": "What was the name of the street you grew up on?",
      "category": "childhood",
      "is_active": true,
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ],
  "categories": ["childhood", "family", "education", "personal", "work"],
  "info": {
    "type": "predefined",
    "description": "Choose from our secure, tested questions. You must select at least 1 question.",
    "minRequired": 1,
    "maxAllowed": 5,
    "totalAvailable": 10
  }
}
```

### 2. Check if User Has Security Questions
**GET** `/api/security-questions/check`

**Headers:** `Authorization: Bearer <token>`

Checks if the authenticated user has security questions set up.

**Response:**
```json
{
  "hasSecurityQuestions": true,
  "message": "User has security questions set up"
}
```

### 3. Get User's Security Questions
**GET** `/api/security-questions/user-questions`

**Headers:** `Authorization: Bearer <token>`

Returns the user's security questions (without answers).

**Response:**
```json
{
  "message": "User security questions retrieved successfully",
  "questions": [
    {
      "id": 1,
      "user_id": 123,
      "question": "What was the name of your first pet?",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

### 4. Set Up Security Questions
**POST** `/api/security-questions/setup`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "questions": [
    {
      "predefined_question_id": 1,
      "answer": "Fluffy"
    },
    {
      "predefined_question_id": 2,
      "answer": "Main Street"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Security questions set up successfully",
  "questions": [
    {
      "id": 1,
      "user_id": 123,
      "question": "What was the name of your first pet?",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

### 5. Update Security Questions
**PUT** `/api/security-questions/update`

**Headers:** `Authorization: Bearer <token>`

**Body:** Same as setup endpoint

Updates existing security questions (replaces all existing questions).

### 6. Verify Security Question Answers
**POST** `/api/security-questions/verify`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "answers": ["Fluffy", "Main Street"]
}
```

**Response:**
```json
{
  "message": "Security questions verified successfully",
  "verified": true
}
```

### 7. Change Password with Security Questions
**POST** `/api/security-questions/change-password`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123",
  "securityAnswers": ["Fluffy", "Main Street"]
}
```

**Response:**
```json
{
  "message": "Password changed successfully",
  "success": true
}
```

### 8. Simple Password Change (No Security Questions)
**POST** `/api/auth/change-password`

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password changed successfully",
  "success": true
}
```

### 9. Forgot Password
**POST** `/api/auth/forgot-password`

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Security questions retrieved successfully",
  "email": "user@example.com",
  "questions": [
    {
      "id": 1,
      "user_id": 123,
      "question": "What was the name of your first pet?",
      "created_at": "2025-01-15T10:00:00.000Z",
      "updated_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

### 10. Reset Password
**POST** `/api/auth/reset-password`

**Body:**
```json
{
  "email": "user@example.com",
  "newPassword": "newpassword123",
  "securityAnswers": ["Fluffy", "Main Street"]
}
```

**Response:**
```json
{
  "message": "Password reset successfully",
  "success": true
}
```

## Implementation Details

### Models

#### SecurityQuestion Model
- Handles CRUD operations for security questions
- Hashes answers using bcrypt
- Provides verification methods
- Supports bulk creation and updates

#### User Model Extensions
- `hasSecurityQuestions()`: Check if user has security questions
- `getSecurityQuestions()`: Get user's security questions
- `updatePassword()`: Update user password with hashing

### Controllers

#### SecurityQuestionController
- Manages all security question operations
- Provides predefined questions list
- Handles setup, update, and verification
- Implements password change with security verification

#### AuthController Extensions
- Added simple password change for users without security questions
- Redirects users with security questions to use security question endpoint

### Validation

The system includes comprehensive validation:
- Question text: 10-500 characters
- Answer text: 2-255 characters
- Minimum 2 questions, maximum 5 questions
- Password requirements: minimum 8 characters
- Required field validation

### Security Features

1. **Answer Hashing**: All answers are hashed using bcrypt with salt rounds of 12
2. **Case Insensitive**: Answers are converted to lowercase before hashing and comparison
3. **Trimmed Input**: All inputs are trimmed of whitespace
4. **Authentication Required**: All endpoints require valid JWT token
5. **User Isolation**: Users can only access their own security questions

## Usage Flow

### For New Users (No Security Questions)
1. User calls `/api/security-questions/check` to verify they need to set up questions
2. User calls `/api/security-questions/predefined-questions` to get question options
3. User calls `/api/security-questions/setup` to set up their questions
4. User can now use `/api/security-questions/change-password` for password changes

### For Existing Users (With Security Questions)
1. User calls `/api/security-questions/change-password` with current password, new password, and security answers
2. System verifies current password and security answers
3. If valid, password is updated

### For Users Who Want to Update Security Questions
1. User calls `/api/security-questions/update` with new questions and answers
2. System replaces all existing questions with new ones

### For Forgot Password Flow
1. User calls `/api/auth/forgot-password` with their email address
2. System returns the user's security questions (without answers)
3. User calls `/api/auth/reset-password` with email, new password, and security question answers
4. System verifies the security answers and updates the password
5. User can now login with their new password

## Error Handling

The system provides detailed error messages for:
- Invalid input validation
- Missing required fields
- Incorrect security question answers
- Invalid current password
- Security questions not set up
- Duplicate security question setup attempts

## Migration

To set up the security questions system:

1. Run the database migration:
   ```bash
   # The migration file is located at:
   # supabase/migrations/20250115000014_create_security_questions_table.sql
   ```

2. The system is automatically integrated into the existing authentication flow

## Testing

You can test the endpoints using the following flow:

1. **Register/Login** to get an authentication token
2. **Check security questions**: `GET /api/security-questions/check`
3. **Get predefined questions**: `GET /api/security-questions/predefined-questions`
4. **Set up questions**: `POST /api/security-questions/setup`
5. **Change password**: `POST /api/security-questions/change-password`

## Security Considerations

1. **Answer Storage**: Answers are hashed and never stored in plain text
2. **Rate Limiting**: Consider implementing rate limiting for verification attempts
3. **Audit Logging**: Consider logging security question setup and password change events
4. **Question Diversity**: The predefined questions cover various personal topics
5. **Answer Complexity**: Consider requiring minimum answer length or complexity

## Future Enhancements

1. **Question Categories**: Organize questions by category (childhood, education, etc.)
2. **Custom Questions**: Allow users to create completely custom questions
3. **Question Rotation**: Periodically prompt users to update their questions
4. **Backup Methods**: Implement alternative verification methods (email, SMS)
5. **Analytics**: Track security question usage and effectiveness
