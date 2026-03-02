const express = require('express');
const { google } = require('googleapis');
const path = require('path');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// ==== Google Drive API config ====
const CLIENT_ID = process.env.YOUR_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUR_CLIENT_SECRET;
const REDIRECT_URI = process.env.YOUR_REDIRECT_URI;
const REFRESH_TOKEN = process.env.YOUR_REFRESH_TOKEN;

// Kiểm tra và warning nhưng không exit (để tránh lỗi trên Vercel)
if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !REFRESH_TOKEN) {
  console.warn('⚠️  Thiếu một số environment variables - API sẽ không hoạt động');
  console.warn('Vui lòng set các biến: YOUR_CLIENT_ID, YOUR_CLIENT_SECRET, YOUR_REDIRECT_URI, YOUR_REFRESH_TOKEN');
}
// ==== 🔒 PUBLIC FOLDER CỐ ĐỊNH ====
const FIXED_FOLDER_ID = "1nVG6vLAD5H3Vqhqlqs5enDgtmfcVgYOo";

let oauth2Client = null;
let drive = null;

if (CLIENT_ID && CLIENT_SECRET && REDIRECT_URI && REFRESH_TOKEN) {
  oauth2Client = new google.auth.OAuth2(
    CLIENT_ID, CLIENT_SECRET, REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
  drive = google.drive({ version: 'v3', auth: oauth2Client });
}

app.use(express.json());

// ==== Middleware: Check API availability ====
app.use((req, res, next) => {
  if (!drive && req.path !== '/' && !req.path.startsWith('/public')) {
    return res.status(503).json({ error: 'API chưa được cấu hình - Vui lòng set environment variables' });
  }
  next();
});

// ==== Cache cho upload root folder ====
let uploadRootFolderId = null;

async function ensureUploadRoot() {
  if (uploadRootFolderId) return uploadRootFolderId;

  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and name='UploadServer' and trashed=false",
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (res.data.files.length > 0) {
    uploadRootFolderId = res.data.files[0].id;
  } else {
    const folderMeta = {
      name: 'UploadServer',
      mimeType: 'application/vnd.google-apps.folder'
    };
    const folder = await drive.files.create({
      resource: folderMeta,
      fields: 'id'
    });
    uploadRootFolderId = folder.data.id;
  }
  return uploadRootFolderId;
}

// ==== Helper: Tạo folder theo path ====
async function getOrCreateFolderByPath(folderPath, parentId) {
  let currentParent = parentId;
  if (!folderPath) return currentParent;

  const parts = folderPath.split('/').filter(Boolean);
  for (const part of parts) {
    const res = await drive.files.list({
      q: `'${currentParent}' in parents and mimeType='application/vnd.google-apps.folder' and name='${part.replace(/'/g, "\\'")}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (res.data.files.length > 0) {
      currentParent = res.data.files[0].id;
    } else {
      const folderMeta = {
        name: part,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [currentParent]
      };
      const folder = await drive.files.create({
        resource: folderMeta,
        fields: 'id'
      });
      currentParent = folder.data.id;
    }
  }
  return currentParent;
}
async function isInsideFixedFolder(fileId) {
  let currentId = fileId;

  while (currentId) {
    if (currentId === FIXED_FOLDER_ID) return true;

    const meta = await drive.files.get({
      fileId: currentId,
      fields: 'parents'
    });

    if (!meta.data.parents || meta.data.parents.length === 0) {
      return false;
    }

    currentId = meta.data.parents[0];
  }

  return false;
}
// ==== Helper: Tạo share link ====
async function getOrCreateShareLink(fileId) {
  const perms = await drive.permissions.list({ fileId });
  let hasAnyone = perms.data.permissions &&
    perms.data.permissions.some(p =>
      p.type === 'anyone' && (p.role === 'reader' || p.role === 'writer')
    );

  if (!hasAnyone) {
    try {
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
        fields: 'id'
      });
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      if (!String(err).includes('alreadyExists')) {
        console.error('Cấp quyền chia sẻ lỗi:', err?.errors || err?.message);
      }
    }
  }

  for (let i = 0; i < 3; ++i) {
    const meta = await drive.files.get({
      fileId,
      fields: 'webViewLink, permissions'
    });
    const anyonePerm = (meta.data.permissions || []).some(p =>
      p.type === 'anyone' && (p.role === 'reader' || p.role === 'writer')
    );
    if (anyonePerm) return meta.data.webViewLink;
    await new Promise(r => setTimeout(r, 600));
  }

  const meta = await drive.files.get({
    fileId,
    fields: 'webViewLink'
  });
  return meta.data.webViewLink;
}





// ==== 🔒 PUBLIC: List file trong folder cố định ====
app.get('/files', async (req, res) => {
  try {
    const parentId = req.query.parentId || FIXED_FOLDER_ID;

    // 🔒 Kiểm tra có nằm trong folder cố định không
    const allowed = await isInsideFixedFolder(parentId);
    if (!allowed) {
      return res.status(403).json({ error: 'Không có quyền truy cập thư mục này' });
    }

    const result = await drive.files.list({
      q: `'${parentId}' in parents and trashed=false`,
      fields: 'files(id, name, modifiedTime, size, mimeType)',
      spaces: 'drive'
    });

    const files = (result.data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      modifiedTime: f.modifiedTime,
      size: f.size,
      mimeType: f.mimeType,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder'
    }));

    res.json(files);

  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});




// ==== API cũ: Download file ====
// ==== 🔒 PUBLIC DOWNLOAD ONLY ====
app.get('/download/:id', async (req, res) => {
  try {
    const fileId = req.params.id;

    const allowed = await isInsideFixedFolder(fileId);
    if (!allowed) {
      return res.status(403).send('Không có quyền tải file này');
    }

    const meta = await drive.files.get({
      fileId,
      fields: 'name, mimeType'
    });

    const driveRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // 🔥 QUAN TRỌNG NHẤT CHO MOBILE
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${meta.data.name}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    driveRes.data.pipe(res);

  } catch (err) {
    res.status(404).send('Không tìm thấy file');
  }
});


// ==== Serve static files ====
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;