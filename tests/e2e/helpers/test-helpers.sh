#!/bin/bash

# Server configuration
SERVER_URL=$(grep '^SERVER_URL=' .env-dev | cut -d '=' -f2-)
SERVER_PORT=$(grep '^SERVER_PORT=' .env-dev | cut -d '=' -f2-)
BASE_URL="${SERVER_URL}:${SERVER_PORT}/api/v1"

# Test file ID
TEST_FILE_ID="${TEST_FILE_ID:-68cbd62f2210a6d66d05900e}"

# Paths & Fixtures
HELPERS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../fixtures" && pwd)"
HELPER_SCRIPT_JS="${HELPERS_DIR}/test-helpers.js"
TEST_USERS_FILE="${FIXTURES_DIR}/test-users.json"

# Sysadmin credentials
SYSADMIN_USERNAME=$(grep '^SYS_USER_USERNAME=' .env-dev | cut -d '=' -f2-)
SYSADMIN_PASSWORD=$(grep '^SYS_USER_PASS=' .env-dev | cut -d '=' -f2-)

# Test user credentials
TEST_USER_USERNAME=$(grep '^TEST_USER_USERNAME=' .env-dev | cut -d '=' -f2-)
TEST_USER_FIRSTNAME=$(grep '^TEST_USER_FIRST=' .env-dev | cut -d '=' -f2-)
TEST_USER_LASTNAME=$(grep '^TEST_USER_LAST=' .env-dev | cut -d '=' -f2-)
TEST_USER_EMAIL=$(grep '^TEST_USER_MAIL=' .env-dev | cut -d '=' -f2-)
TEST_USER_PASSWORD=$(grep '^TEST_USER_PASS=' .env-dev | cut -d '=' -f2-)

# HTTP status codes
HTTP_OK=200
HTTP_CREATED=201
HTTP_BAD_REQUEST=400
HTTP_UNAUTHORIZED=401
HTTP_FORBIDDEN=403
HTTP_NOT_FOUND=404
HTTP_CONFLICT=409
