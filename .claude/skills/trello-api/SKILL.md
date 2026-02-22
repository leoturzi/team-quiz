---
name: trello-api
description: Manage Trello boards, lists, cards, labels, and comments via REST API using curl. Use when the agent needs to read cards, create cards, update descriptions/labels/lists, post comments, or discover board/list IDs. Trigger on mentions of Trello, Kanban board, Inbox triage, Backlog management, or card operations.
---

# Trello REST API Skill

## Authentication

All requests require two query params loaded from `.env.local`:

| Variable | Description |
|----------|-------------|
| `TRELLO_API_KEY` | Public app key ([generate here](https://trello.com/power-ups/admin)) |
| `TRELLO_TOKEN` | Private token (click "Token" link on the API key page, then "Allow") |

### How to generate credentials

1. Go to https://trello.com/power-ups/admin
2. Create a Power-Up (or use existing), go to **API Key** tab, click **Generate a new API Key**
3. On the same page, click the **Token** hyperlink next to your key
4. Click **Allow** on the authorization screen
5. Copy both values into `.env.local`:

```
TRELLO_API_KEY=your_32_char_key
TRELLO_TOKEN=your_token
```

### Loading credentials in shell

```bash
export $(grep -E '^TRELLO_' .env.local | xargs)
```

All curl examples below assume `$TRELLO_API_KEY` and `$TRELLO_TOKEN` are exported.

### Base URL

```
https://api.trello.com/1
```

### Auth suffix (append to every request)

```
key=$TRELLO_API_KEY&token=$TRELLO_TOKEN
```

---

## Discovery Commands

Use these to find board/list/label IDs before running triage operations.

### Get all boards for authenticated user

```bash
curl -s "https://api.trello.com/1/members/me/boards?fields=id,name,url&key=$TRELLO_API_KEY&token=$TRELLO_TOKEN"
```

**Response:** array of board objects

```json
[
  {
    "id": "60d5ecb2...",
    "name": "GDP Quiz Game",
    "url": "https://trello.com/b/abc123/gdp-quiz-game"
  }
]
```

### Get all lists on a board

```bash
curl -s "https://api.trello.com/1/boards/{boardId}/lists?fields=id,name&key=$TRELLO_API_KEY&token=$TRELLO_TOKEN"
```

**Response:**

```json
[
  { "id": "64a1b2c3...", "name": "Inbox" },
  { "id": "64a1b2c4...", "name": "Backlog" },
  { "id": "64a1b2c5...", "name": "In Progress" }
]
```

### Get all labels on a board

```bash
curl -s "https://api.trello.com/1/boards/{boardId}/labels?fields=id,name,color&key=$TRELLO_API_KEY&token=$TRELLO_TOKEN"
```

**Response:**

```json
[
  { "id": "65f1a2b3...", "name": "Bug", "color": "red" },
  { "id": "65f1a2b4...", "name": "Feature", "color": "blue" }
]
```

After discovery, store these IDs in `.env.local`:

```
TRELLO_BOARD_ID=...
TRELLO_INBOX_LIST_ID=...
TRELLO_BACKLOG_LIST_ID=...
TRELLO_LABEL_BUG_ID=...
TRELLO_LABEL_FEATURE_ID=...
```

---

## Card Operations

### Get all cards in a list (e.g. Inbox)

```bash
curl -s "https://api.trello.com/1/lists/{listId}/cards?fields=id,name,desc,labels,idList&key=$TRELLO_API_KEY&token=$TRELLO_TOKEN"
```

**Response:**

```json
[
  {
    "id": "cardId123",
    "name": "Fix login redirect bug",
    "desc": "Users get stuck on /login after OAuth...",
    "labels": [],
    "idList": "64a1b2c3..."
  }
]
```

### Get a single card

```bash
curl -s "https://api.trello.com/1/cards/{cardId}?fields=id,name,desc,labels,idList,url&key=$TRELLO_API_KEY&token=$TRELLO_TOKEN"
```

**Response:**

```json
{
  "id": "cardId123",
  "name": "Fix login redirect bug",
  "desc": "Users get stuck on /login...",
  "labels": [{ "id": "65f1a2b3...", "name": "Bug", "color": "red" }],
  "idList": "64a1b2c3...",
  "url": "https://trello.com/c/abc123"
}
```

### Create a new card

```bash
curl -s -X POST "https://api.trello.com/1/cards" \
  -d "idList={listId}" \
  -d "name=Card Title" \
  --data-urlencode "desc=Card description here" \
  -d "key=$TRELLO_API_KEY" \
  -d "token=$TRELLO_TOKEN"
```

**Response:** full card object (same shape as GET single card).

### Update a card (description, name, or move to a different list)

```bash
curl -s -X PUT "https://api.trello.com/1/cards/{cardId}" \
  --data-urlencode "desc=New description content" \
  -d "key=$TRELLO_API_KEY" \
  -d "token=$TRELLO_TOKEN"
```

**Updatable fields (pass as form data):**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Card title |
| `desc` | string | Card description (markdown supported) |
| `idList` | string | Move card to a different list |
| `closed` | boolean | Archive the card |
| `pos` | string/number | Position in list (`top`, `bottom`, or float) |

**Response:** updated card object.

### Move a card to another list

```bash
curl -s -X PUT "https://api.trello.com/1/cards/{cardId}" \
  -d "idList={targetListId}" \
  -d "key=$TRELLO_API_KEY" \
  -d "token=$TRELLO_TOKEN"
```

### Delete a card

```bash
curl -s -X DELETE "https://api.trello.com/1/cards/{cardId}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN"
```

**Response:** empty object `{}` on success.

---

## Label Operations

### Add an existing label to a card

```bash
curl -s -X POST "https://api.trello.com/1/cards/{cardId}/idLabels" \
  -d "value={labelId}" \
  -d "key=$TRELLO_API_KEY" \
  -d "token=$TRELLO_TOKEN"
```

**Response:** array of label IDs now on the card.

```json
["65f1a2b3...", "65f1a2b4..."]
```

### Remove a label from a card

```bash
curl -s -X DELETE "https://api.trello.com/1/cards/{cardId}/idLabels/{labelId}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN"
```

### Create a new label on the board

```bash
curl -s -X POST "https://api.trello.com/1/labels" \
  -d "name=Bug" \
  -d "color=red" \
  -d "idBoard={boardId}" \
  -d "key=$TRELLO_API_KEY" \
  -d "token=$TRELLO_TOKEN"
```

**Available colors:** `yellow`, `purple`, `blue`, `red`, `green`, `orange`, `black`, `sky`, `pink`, `lime`, `null` (no color).

**Response:**

```json
{
  "id": "newLabelId",
  "idBoard": "boardId",
  "name": "Bug",
  "color": "red"
}
```

---

## Comment Operations

### Add a comment to a card

```bash
curl -s -X POST "https://api.trello.com/1/cards/{cardId}/actions/comments" \
  --data-urlencode "text=Your comment text here" \
  -d "key=$TRELLO_API_KEY" \
  -d "token=$TRELLO_TOKEN"
```

**Response:**

```json
{
  "id": "actionId",
  "type": "commentCard",
  "data": {
    "text": "Your comment text here",
    "card": { "id": "cardId123", "name": "Card Title" }
  },
  "memberCreator": { "id": "memberId", "username": "you" }
}
```

### Update an existing comment

```bash
curl -s -X PUT "https://api.trello.com/1/cards/{cardId}/actions/{actionId}/comments" \
  --data-urlencode "text=Updated comment text" \
  -d "key=$TRELLO_API_KEY" \
  -d "token=$TRELLO_TOKEN"
```

### Delete a comment

```bash
curl -s -X DELETE "https://api.trello.com/1/cards/{cardId}/actions/{actionId}/comments?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN"
```

---

## Triage Description Template

When the `project-triage-board-manager` agent updates a card description, use this exact format:

```
**Type:** [Bug/Feature]
**Complexity Score:** [Score]/10 (Impact: [I], Effort: [C], Testing: [T])
**Area:** [e.g., Quiz Page, Lobby, Auth, Store, Database]

**Description:**
[Clear, structured breakdown of the request]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
```

Use `--data-urlencode "desc=..."` when sending this via curl to handle special characters.

---

## Error Handling

All endpoints return standard HTTP status codes:

| Status | Meaning | Action |
|--------|---------|--------|
| `200` | Success | Parse response JSON |
| `400` | Bad request | Check required params |
| `401` | Unauthorized | Verify `TRELLO_API_KEY` and `TRELLO_TOKEN` |
| `404` | Not found | Verify board/list/card ID |
| `429` | Rate limited | Wait and retry (max 100 requests per 10s per token) |

Always check exit code and HTTP status:

```bash
response=$(curl -s -w "\n%{http_code}" "https://api.trello.com/1/cards/{cardId}?key=$TRELLO_API_KEY&token=$TRELLO_TOKEN")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" != "200" ]; then
  echo "Error $http_code: $body"
fi
```

---

## Rate Limits

- **100 requests per 10 seconds** per token
- **300 requests per 10 seconds** per API key
- Add `sleep 0.1` between sequential bulk operations if needed

---

## Quick Reference

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List boards | GET | `/members/me/boards` |
| List lists | GET | `/boards/{boardId}/lists` |
| List labels | GET | `/boards/{boardId}/labels` |
| List cards in list | GET | `/lists/{listId}/cards` |
| Get card | GET | `/cards/{cardId}` |
| Create card | POST | `/cards` |
| Update card | PUT | `/cards/{cardId}` |
| Move card | PUT | `/cards/{cardId}` (set `idList`) |
| Delete card | DELETE | `/cards/{cardId}` |
| Add label to card | POST | `/cards/{cardId}/idLabels` |
| Remove label | DELETE | `/cards/{cardId}/idLabels/{labelId}` |
| Create label | POST | `/labels` |
| Add comment | POST | `/cards/{cardId}/actions/comments` |
| Update comment | PUT | `/cards/{cardId}/actions/{actionId}/comments` |
| Delete comment | DELETE | `/cards/{cardId}/actions/{actionId}/comments` |
