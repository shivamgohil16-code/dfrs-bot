const { google } = require('googleapis');
const { secondsToHMS, hmsToSeconds } = require('./time');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';
const HEADER_ROW = parseInt(process.env.HEADER_ROW || '1', 10);
const COL_USERNAME = (process.env.COL_USERNAME || 'A').toUpperCase();
const COL_QUOTA = (process.env.COL_QUOTA || 'C').toUpperCase();
const QUOTA_TARGET_SECONDS = parseInt(process.env.QUOTA_TARGET_SECONDS || '1800', 10);

// Colours matched to the ORBAT screenshot (light green / light red)
const GREEN = { red: 0.714, green: 0.843, blue: 0.659 };
const RED = { red: 0.918, green: 0.6, blue: 0.6 };

let sheetsClientPromise = null;
let sheetIdCache = null; // numeric gid for SHEET_NAME, cached after first lookup

function columnLetterToIndex(letter) {
  // A -> 0, B -> 1, ... Z -> 25, AA -> 26 ...
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
}

function getClient() {
  if (!sheetsClientPromise) {
    sheetsClientPromise = (async () => {
      const auth = new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
      );
      await auth.authorize();
      return google.sheets({ version: 'v4', auth });
    })();
  }
  return sheetsClientPromise;
}

async function getSheetGid(sheets) {
  if (sheetIdCache !== null) return sheetIdCache;
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find((s) => s.properties.title === SHEET_NAME);
  if (!sheet) {
    throw new Error(`Could not find a tab named "${SHEET_NAME}" in the spreadsheet.`);
  }
  sheetIdCache = sheet.properties.sheetId;
  return sheetIdCache;
}

/**
 * Finds the sheet row number (1-indexed, matching the actual row on the sheet)
 * for a given username. Case-insensitive, trims whitespace. Returns null if not found.
 */
async function findUserRow(username) {
  const sheets = await getClient();
  const range = `${SHEET_NAME}!${COL_USERNAME}${HEADER_ROW + 1}:${COL_USERNAME}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const rows = res.data.values || [];
  const target = username.trim().toLowerCase();

  for (let i = 0; i < rows.length; i++) {
    const cell = (rows[i][0] || '').trim();
    // strip a leading "@" in case someone types it with one
    const cellClean = cell.replace(/^@/, '').toLowerCase();
    if (cellClean === target || cell.toLowerCase() === target) {
      return HEADER_ROW + 1 + i;
    }
  }
  return null;
}

/**
 * Reads the current quota cell for a row and returns it as whole seconds.
 */
async function getCurrentQuotaSeconds(row) {
  const sheets = await getClient();
  const range = `${SHEET_NAME}!${COL_QUOTA}${row}`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const value = res.data.values?.[0]?.[0] || '00:00:00';
  return hmsToSeconds(value);
}

/**
 * Adds `secondsToAdd` to the existing quota for `row`, writes the new HH:MM:SS
 * value back, and colours the cell green if the target is met, red otherwise.
 * Returns { previousSeconds, newSeconds, newHMS, quotaMet }.
 */
async function addQuotaSeconds(row, secondsToAdd) {
  const sheets = await getClient();
  const previousSeconds = await getCurrentQuotaSeconds(row);
  const newSeconds = previousSeconds + secondsToAdd;
  const newHMS = secondsToHMS(newSeconds);
  const quotaMet = newSeconds >= QUOTA_TARGET_SECONDS;
  const gid = await getSheetGid(sheets);
  const colIndex = columnLetterToIndex(COL_QUOTA);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateCells: {
            range: {
              sheetId: gid,
              startRowIndex: row - 1,
              endRowIndex: row,
              startColumnIndex: colIndex,
              endColumnIndex: colIndex + 1,
            },
            rows: [
              {
                values: [
                  {
                    userEnteredValue: { stringValue: newHMS },
                    userEnteredFormat: {
                      backgroundColor: quotaMet ? GREEN : RED,
                    },
                  },
                ],
              },
            ],
            fields: 'userEnteredValue,userEnteredFormat.backgroundColor',
          },
        },
      ],
    },
  });

  return { previousSeconds, newSeconds, newHMS, quotaMet };
}

module.exports = {
  findUserRow,
  getCurrentQuotaSeconds,
  addQuotaSeconds,
  QUOTA_TARGET_SECONDS,
};
