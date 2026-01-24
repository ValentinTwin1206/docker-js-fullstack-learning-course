#!/usr/bin/env bats

bats_require_minimum_version 1.5.0

# Load helper functions
source "$(dirname "$BATS_TEST_FILENAME")/../helpers/test-helpers.sh"

setup_file() {
  #
  # Generate API Keys using generateApiKey function
  # # # # # # 
  
  # Try to use existing keys from environment, otherwise generate new ones
  if [ -z "$SYSADMIN_API_KEY" ] || [ -z "$TEST_USER_API_KEY" ]; then
    echo "[SETUP] Generating API keys..." >&3
    
    if [ ! -f "$HELPER_SCRIPT_JS" ]; then
      echo "[SETUP] ERROR: Helper script not found: $HELPER_SCRIPT_JS" >&3
      exit 1
    fi
    
    # Generate API key for sysadmin
    SYSADMIN_API_KEY=$(node --input-type=module -e "
      import { generateApiKey } from 'file://$HELPER_SCRIPT_JS';
      generateApiKey('$SYSADMIN_USERNAME', 'sysadmin').then(key => console.log(key));
    ")
    
    # Generate API key for test user
    TEST_USER_API_KEY=$(node --input-type=module -e "
      import { generateApiKey } from 'file://$HELPER_SCRIPT_JS';
      generateApiKey('$TEST_USER_USERNAME', 'user').then(key => console.log(key));
    ")
    
    if [ -z "$SYSADMIN_API_KEY" ] || [ -z "$TEST_USER_API_KEY" ]; then
      echo "[SETUP] ERROR: Failed to generate API keys" >&3
      exit 1
    fi
    
    export SYSADMIN_API_KEY
    export TEST_USER_API_KEY
  fi
  
  echo "[SETUP] API keys loaded successfully" >&3
  echo "[SETUP] SYSADMIN_API_KEY: ${SYSADMIN_API_KEY:0:15}..." >&3
  echo "[SETUP] TEST_USER_API_KEY: ${TEST_USER_API_KEY:0:15}..." >&3
}

teardown_file() {
  #
  # Reset role of test user to 'user'
  # # # # # # 
  role="user"
  if ! curl -s -X PATCH "$BASE_URL/roles/$TEST_USER_USERNAME" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"role\":\"$role\"}" >/dev/null; then
    echo "[TEARDOWN] Failed to reset '$TEST_USER_USERNAME' to '$role'" >&3
  fi

  #
  # Delete user 'preRegistered'
  # # # # # # 
  email=$(jq -r '.preRegistered.email' "$TEST_USERS_FILE")
  username=$(curl -s "$BASE_URL/users" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    | jq -r ".data[] | select(.email==\"$email\") | .username")
  
  if [ -n "$username" ]; then
    if ! curl -s -X DELETE "$BASE_URL/users/$username" \
      -H "Authorization: Bearer $SYSADMIN_API_KEY" >/dev/null; then
      echo "[TEARDOWN] Failed to delete '$username' from server" >&3
    fi
  fi
}


#
# USERS
# # # # # # # # #
@test "GET /users (OK)" {
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" "$BASE_URL/users"
  
  # ASSERT
  [ "$output" -eq "$HTTP_OK" ]
}

@test "GET /users (FORBIDDEN)" {
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -H "Authorization: Bearer $TEST_USER_API_KEY" "$BASE_URL/users"
  
  # ASSERT
  [ "$output" -eq "$HTTP_FORBIDDEN" ]
}

@test "GET /users (UNAUTHORIZED)" {
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" "$BASE_URL/users"
  
  # ASSERT
  [ "$output" -eq "$HTTP_UNAUTHORIZED" ]
}

@test "GET /user (OK)" {
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" "$BASE_URL/user"
 
  # ASSERT
  [ "$output" -eq "$HTTP_OK" ]
}

@test "GET /user (FORBIDDEN)" {
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -H "Authorization: Bearer $TEST_USER_API_KEY" "$BASE_URL/user"
  
  # ASSERT
  [ "$output" -eq "$HTTP_FORBIDDEN" ]
}

@test "GET /user (UNAUTHORIZED)" {
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" "$BASE_URL/user"
  
  # ASSERT
  [ "$output" -eq "$HTTP_UNAUTHORIZED" ]
}

@test "GET /users/:username (OK)" {
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -H "Authorization: Bearer $TEST_USER_API_KEY" "$BASE_URL/users/$TEST_USER_USERNAME"
  
  # ASSERT
  [ "$output" -eq "$HTTP_OK" ]
}

@test "GET /users/:username (FORBIDDEN)" {
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -H "Authorization: Bearer $TEST_USER_API_KEY" "$BASE_URL/users/$SYSADMIN_USERNAME"
  
  # ASSERT
  [ "$output" -eq "$HTTP_FORBIDDEN" ]
}

@test "GET /users/:username (UNAUTHORIZED)" {
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" "$BASE_URL/users/$TEST_USER_USERNAME"
  
  # ASSERT
  [ "$output" -eq "$HTTP_UNAUTHORIZED" ]
}

@test "POST /users (BAD REQUEST with invalid values)" {
  # ARRANGE
  firstname=$(jq -r '.invalid.firstname' "$TEST_USERS_FILE")
  lastname=$(jq -r '.invalid.lastname' "$TEST_USERS_FILE")
  email=$(jq -r '.invalid.email' "$TEST_USERS_FILE")
  password=$(jq -r '.invalid.extraField' "$TEST_USERS_FILE")
  
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -X POST "$BASE_URL/users" \
    -H "Content-Type: application/json" \
    -d "{\"firstname\":\"$firstname\",\"lastname\":\"$lastname\",\"password\":\"$password\",\"email\":\"$email\"}"
  
  # ASSERT
  [ "$output" -eq "$HTTP_BAD_REQUEST" ]
}

@test "POST /users (BAD REQUEST with extra field)" {
  # ARRANGE
  firstname=$(jq -r '.preRegistered.firstname' "$TEST_USERS_FILE")
  lastname=$(jq -r '.preRegistered.lastname' "$TEST_USERS_FILE")
  email=$(jq -r '.preRegistered.email' "$TEST_USERS_FILE")
  password=$(jq -r '.preRegistered.password' "$TEST_USERS_FILE")
  
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -X POST "$BASE_URL/users" \
    -H "Content-Type: application/json" \
    -d "{\"firstname\":\"$firstname\",\"lastname\":\"$lastname\",\"email\":\"$email\",\"password\":\"$password\",\"foo\":\"bar\"}"

  # ASSERT
  [ "$output" -eq "$HTTP_BAD_REQUEST" ]
}

@test "POST /users (BAD REQUEST with missing field)" {
  # ARRANGE
  firstname=$(jq -r '.preRegistered.firstname' "$TEST_USERS_FILE")
  lastname=$(jq -r '.preRegistered.lastname' "$TEST_USERS_FILE")
  email=$(jq -r '.preRegistered.email' "$TEST_USERS_FILE")
  
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -X POST "$BASE_URL/users" \
    -H "Content-Type: application/json" \
    -d "{\"firstname\":\"$firstname\",\"lastname\":\"$lastname\",\"email\":\"$email\"}"

  # ASSERT
  [ "$output" -eq "$HTTP_BAD_REQUEST" ]
}

@test "POST /users (CREATED)" {
  # ARRANGE
  firstname=$(jq -r '.preRegistered.firstname' "$TEST_USERS_FILE")
  lastname=$(jq -r '.preRegistered.lastname' "$TEST_USERS_FILE")
  email=$(jq -r '.preRegistered.email' "$TEST_USERS_FILE")
  password=$(jq -r '.preRegistered.password' "$TEST_USERS_FILE")
  
  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/users" \
    -H "Content-Type: application/json" \
    -d "{\"firstname\":\"$firstname\",\"lastname\":\"$lastname\",\"email\":\"$email\",\"password\":\"$password\"}"

  # ASSERT
  [ "$output" -eq "$HTTP_CREATED" ]
}

@test "POST /users (CONFLICT)" {
  # ARRANGE
  firstname=$(jq -r '.preRegistered.firstname' "$TEST_USERS_FILE")
  lastname=$(jq -r '.preRegistered.lastname' "$TEST_USERS_FILE")
  email=$(jq -r '.preRegistered.email' "$TEST_USERS_FILE")
  password=$(jq -r '.preRegistered.password' "$TEST_USERS_FILE")
  
  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/users" \
    -H "Content-Type: application/json" \
    -d "{\"firstname\":\"$firstname\",\"lastname\":\"$lastname\",\"email\":\"$email\",\"password\":\"$password\"}"

  # ASSERT
  [ "$status" -eq 0 ]   
  [ "$output" -eq "$HTTP_CONFLICT" ] 
}

@test "PATCH /users/:username (OK)" {
  # ARRANGE
  new_firstname="UpdatedFirst"
  new_lastname="UpdatedLast"

  # ACT
  response=$(curl -s -w "%{http_code}" \
    -X PATCH "$BASE_URL/users/$TEST_USER_USERNAME" \
    -H "Authorization: Bearer $TEST_USER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"firstname\": \"$new_firstname\",\"lastname\": \"$new_lastname\",\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}")

  http_code="${response: -3}"
  body="${response::-3}"
  updated_firstname=$(echo "$body" | jq -r '.data.firstname')
  updated_lastname=$(echo "$body" | jq -r '.data.lastname')
  
  # ASSERT
  [ "$http_code" -eq "$HTTP_OK" ]
  [ "$updated_firstname" = "$new_firstname" ]
  [ "$updated_lastname" = "$new_lastname" ]
}

@test "PATCH /users/:username (UNAUTHORIZED)" {
  # ARRANGE
  new_name=$(jq -r '.preRegistered.new_name' "$TEST_USERS_FILE")

  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -X PATCH "$BASE_URL/users/$TEST_USER_USERNAME" \
    -H "Content-Type: application/json" \
    -d "{\"firstname\": \"$new_name\"}"
  
  # ASSERT
  [ "$output" -eq "$HTTP_UNAUTHORIZED" ]
}

@test "PATCH /users/:username (BAD REQUEST)" {
  # ARRANGE
  firstname=$(jq -r '.invalid.firstname' "$TEST_USERS_FILE")
  lastname=$(jq -r '.invalid.lastname' "$TEST_USERS_FILE")
  email=$(jq -r '.invalid.email' "$TEST_USERS_FILE")
  password=$(jq -r '.invalid.extraField' "$TEST_USERS_FILE")
  
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -X PATCH "$BASE_URL/users/$TEST_USER_USERNAME" \
    -H "Authorization: Bearer $TEST_USER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"firstname\":\"$firstname\",\"lastname\":\"$lastname\",\"email\":\"$email\",\"password\":\"$password\"}"
  
  # ASSERT
  [ "$output" -eq "$HTTP_BAD_REQUEST" ]
}

@test "DELETE /users/:username (FORBIDDEN)" {
  # ARRANGE
  email=$(jq -r '.preRegistered.email' "$TEST_USERS_FILE")
  username=$(curl -s "$BASE_URL/users" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    | jq -r ".data[] | select(.email==\"$email\") | .username")

  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -X DELETE "$BASE_URL/users/$username" \
    -H "Authorization: Bearer $TEST_USER_API_KEY"

  # ASSERT
  [ "$status" -eq 0 ]
  [ "$output" -eq "$HTTP_FORBIDDEN" ]
}

@test "DELETE /users/:username (OK)" {
  # ARRANGE
  email=$(jq -r '.preRegistered.email' "$TEST_USERS_FILE")
  username=$(curl -s "$BASE_URL/users" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    | jq -r ".data[] | select(.email==\"$email\") | .username")

  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -X DELETE "$BASE_URL/users/$username" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY"

  # ASSERT
  [ "$status" -eq 0 ]
  [ "$output" -eq "$HTTP_OK" ]
}


#
# API KEYS
# # # # # # # # #
@test "POST /apikeys (BAD REQUEST)" {
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -X POST "$BASE_URL/apikeys" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"foo": "bar"}'
  
  # ASSERT
  [ "$output" -eq "$HTTP_BAD_REQUEST" ]
}

@test "POST /apikeys (UNAUTHORIZED)" {
  # ACT
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -X POST "$BASE_URL/apikeys" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$TEST_USER_USERNAME\", \"tokenName\": \"new-key\"}"
  
  # ASSERT
  [ "$output" -eq "$HTTP_UNAUTHORIZED" ]
}

@test "POST /apikeys (FORBIDDEN)" {
  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/apikeys" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$TEST_USER_USERNAME\", \"tokenName\": \"new-key\"}"
  
  # ASSERT
  [ "$output" -eq "$HTTP_FORBIDDEN" ]
}

@test "POST /apikeys (OK)" {
  # ACT
  response=$(curl -s -w "%{http_code}" \
    -X POST "$BASE_URL/apikeys" \
    -H "Authorization: Bearer $TEST_USER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$TEST_USER_USERNAME\", \"tokenName\": \"new-key\"}")
  
  http_code="${response: -3}"
  body="${response::-3}"
  new_api_key=$(echo "$body" | jq -r '.data.token')
  
  # ASSERT
  [ "$http_code" -eq "$HTTP_CREATED" ]
  [ -n "$new_api_key" ]
  
  # Verify the new API key works
  run curl -s -o /dev/null \
    -w "%{http_code}" \
    -H "Authorization: Bearer $new_api_key" "$BASE_URL/users/$TEST_USER_USERNAME"
  
  [ "$output" -eq "$HTTP_OK" ]
}

@test "POST /apikeys (CONFLICT)" {
  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/apikeys" \
    -H "Authorization: Bearer $TEST_USER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$TEST_USER_USERNAME\", \"tokenName\": \"new-key\"}"
  
  # ASSERT
  [ "$output" -eq "$HTTP_CONFLICT" ]
}

@test "DELETE /apikeys/:username/:tokenName (UNAUTHORIZED)" {
  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X DELETE "$BASE_URL/apikeys/$TEST_USER_USERNAME/new-key"
  
  # ASSERT
  [ "$output" -eq "$HTTP_UNAUTHORIZED" ]
}

@test "DELETE /apikeys/:username/:tokenName (FORBIDDEN)" {
  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X DELETE "$BASE_URL/apikeys/$TEST_USER_USERNAME/new-key" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY"
  
  # ASSERT
  [ "$output" -eq "$HTTP_FORBIDDEN" ]
}

@test "DELETE /apikeys/:username/:tokenName (OK)" {
  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X DELETE "$BASE_URL/apikeys/$TEST_USER_USERNAME/new-key" \
    -H "Authorization: Bearer $TEST_USER_API_KEY"
  
  # ASSERT
  [ "$output" -eq "$HTTP_OK" ]
}


#
# FILES
# # # # # # # # #
@test "GET /files/:id (UNAUTHORIZED)" {
  # ARRANGE
  fileID="68cbd62f2210a6d66d05900e"

  # ACT
  run curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/files/$fileID"
  
  # ASSERT
  [ "$output" -eq "$HTTP_UNAUTHORIZED" ]
}

@test "GET /files/:id (NOT FOUND)" {
  # ARRANGE
  fileID="68cbd62f2210a6d66d05900e"

  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    "$BASE_URL/files/$fileID"
  
  # ASSERT
  [ "$output" -eq "$HTTP_NOT_FOUND" ]
}


#
# ROLES
# # # # # # # # #
@test "PATCH /roles/:username (OK: elevate user to admin)" {
  # ARRANGE
  role="admin"

  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH "$BASE_URL/roles/$TEST_USER_USERNAME" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"role\":\"$role\"}"

  # ASSERT
  [ "$output" -eq "$HTTP_OK" ]
}

@test "PATCH /roles/:username (OK: reset user to user)" {
  # ARRANGE
  role="user"
  
  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH "$BASE_URL/roles/$TEST_USER_USERNAME" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"role\":\"$role\"}"

  # ASSERT
  [ "$output" -eq "$HTTP_OK" ]
}

@test "PATCH /roles/:username (BAD REQUEST: elevate to sysadmin not allowed)" {
  # ARRANGE
  role="sysadmin"

  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH "$BASE_URL/roles/$TEST_USER_USERNAME" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"role\":\"$role\"}"

  # ASSERT
  [ "$output" -eq "$HTTP_FORBIDDEN" ]
}

@test "PATCH /roles/:username (NOT FOUND: unknown role)" {
  # ARRANGE
  role="not_a_real_role"

  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH "$BASE_URL/roles/$TEST_USER_USERNAME" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"role\":\"$role\"}"

  # ASSERT
  [ "$output" -eq "$HTTP_BAD_REQUEST" ]
}

@test "PATCH /roles/:username (NOT FOUND: unknown user)" {
  # ARRANGE
  role="admin"
  username="non_existing_user"
  
  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH "$BASE_URL/roles/$username" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"role\":\"$role\"}"

  # ASSERT
  [ "$output" -eq "$HTTP_NOT_FOUND" ]
}

@test "PATCH /roles/:username (FORBIDDEN: non-admin user tries to elevate)" {
  # ARRANGE
  role="admin"

  # ACT
  run curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH "$BASE_URL/roles/$TEST_USER_USERNAME" \
    -H "Authorization: Bearer $TEST_USER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"role\":\"$role\"}"

  # ASSERT
  [ "$output" -eq "$HTTP_FORBIDDEN" ]
}

@test "PATCH /roles/:username (OK: admin user elevates another user)" {
  # ARRANGE
  firstname=$(jq -r '.preRegistered.firstname' "$TEST_USERS_FILE")
  lastname=$(jq -r '.preRegistered.lastname' "$TEST_USERS_FILE")
  email=$(jq -r '.preRegistered.email' "$TEST_USERS_FILE")
  password=$(jq -r '.preRegistered.password' "$TEST_USERS_FILE")

  # ACT
  # Create test candidate user
  response=$(curl -s -X POST "$BASE_URL/users" \
    -H "Content-Type: application/json" \
    -d "{\"firstname\":\"$firstname\",\"lastname\":\"$lastname\",\"email\":\"$email\",\"password\":\"$password\"}")
  username=$(echo "$response" | jq -r '.data.username')

  # Promote TEST_USER to admin first
  curl -s -X PATCH "$BASE_URL/roles/$TEST_USER_USERNAME" \
    -H "Authorization: Bearer $SYSADMIN_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"role":"admin"}' >/dev/null

  # Create new API key for TEST_USER as admin
  response=$(curl -s -w "%{http_code}" \
    -X POST "$BASE_URL/apikeys" \
    -H "Authorization: Bearer $TEST_USER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$TEST_USER_USERNAME\", \"tokenName\": \"testuser-admin\"}")
  
  body="${response::-3}"
  admin_api_key=$(echo "$body" | jq -r '.data.token')

  # ACT
  # Now TEST_USER (as admin) elevates the candidate using the new API key
  run curl -s -o /dev/null -w "%{http_code}" \
    -X PATCH "$BASE_URL/roles/$username" \
    -H "Authorization: Bearer $admin_api_key" \
    -H "Content-Type: application/json" \
    -d '{"role":"admin"}'
  
  # ASSERT
  [ "$output" -eq "$HTTP_OK" ]
}