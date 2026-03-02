import express from 'express';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/** Local disk cache directory for GridFS files. */
const CACHE_DIR = path.join(__dirname, '..', '..', '.media-cache');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/** Download a GridFS file to local disk cache. Returns the cached file path. */
async function ensureCached(fileId: string, contentType: string): Promise<string | null> {
    const ext = contentType === 'video/mp4' ? '.mp4' : contentType === 'image/png' ? '.png' : '';
    const cachedPath = path.join(CACHE_DIR, `${fileId}${ext}`);

    if (fs.existsSync(cachedPath)) {
        return cachedPath;
    }

    const db = mongoose.connection.db;
    if (!db) return null;

    const bucket = new GridFSBucket(db, { bucketName: 'avatarMedia' });
    const objectId = new mongoose.Types.ObjectId(fileId);

    return new Promise((resolve) => {
        const writeStream = fs.createWriteStream(cachedPath);
        const gridStream = bucket.openDownloadStream(objectId);
        gridStream.pipe(writeStream);
        writeStream.on('finish', () => {
            console.log(`[Media] Cached ${fileId} to ${cachedPath} (${fs.statSync(cachedPath).size} bytes)`);
            resolve(cachedPath);
        });
        gridStream.on('error', (err) => {
            console.error(`[Media] GridFS download error for ${fileId}:`, err.message);
            // Clean up partial file
            try { fs.unlinkSync(cachedPath); } catch {}
            resolve(null);
        });
        writeStream.on('error', (err) => {
            console.error(`[Media] File write error for ${fileId}:`, err.message);
            resolve(null);
        });
    });
}

/**
 * GET /api/media/:id
 * Serves a file from the `avatarMedia` GridFS bucket by its _id.
 * Uses a local disk cache so files are downloaded from Atlas only once.
 * Supports Range requests for video seeking.
 */
router.get('/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            res.status(400).json({ error: 'Invalid media ID' });
            return;
        }

        const db = mongoose.connection.db;
        if (!db) {
            res.status(503).json({ error: 'Database not connected' });
            return;
        }

        const objectId = new mongoose.Types.ObjectId(fileId);

        // Look up file metadata
        const files = await db
            .collection('avatarMedia.files')
            .find({ _id: objectId })
            .toArray();

        if (files.length === 0) {
            res.status(404).json({ error: 'Media not found' });
            return;
        }

        const file = files[0];
        const contentType = file.contentType || 'application/octet-stream';
        const fileLength = file.length;

        // Try to serve from local cache
        const cachedPath = await ensureCached(fileId, contentType);
        if (cachedPath) {
            const stat = fs.statSync(cachedPath);
            const range = req.headers.range;

            if (range && contentType.startsWith('video/')) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
                const chunkSize = end - start + 1;

                res.status(206);
                res.set({
                    'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': String(chunkSize),
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                });
                fs.createReadStream(cachedPath, { start, end }).pipe(res);
            } else {
                res.status(200);
                res.set({
                    'Content-Type': contentType,
                    'Content-Length': String(stat.size),
                    'Accept-Ranges': 'bytes',
                    'Cache-Control': 'public, max-age=31536000, immutable',
                });
                fs.createReadStream(cachedPath).pipe(res);
            }
            return;
        }

        // Fallback: stream directly from GridFS (slow but works)
        const bucket = new GridFSBucket(db, { bucketName: 'avatarMedia' });
        const range = req.headers.range;
        if (range && contentType.startsWith('video/')) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileLength - 1;
            const chunkSize = end - start + 1;

            res.status(206);
            res.set({
                'Content-Range': `bytes ${start}-${end}/${fileLength}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': String(chunkSize),
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            });
            const stream = bucket.openDownloadStream(objectId, { start, end: end + 1 });
            stream.pipe(res);
            stream.on('error', () => { if (!res.headersSent) res.status(500).end(); });
        } else {
            res.status(200);
            res.set({
                'Content-Type': contentType,
                'Content-Length': String(fileLength),
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=31536000, immutable',
            });
            const stream = bucket.openDownloadStream(objectId);
            stream.pipe(res);
            stream.on('error', () => { if (!res.headersSent) res.status(500).end(); });
        }
    } catch (error) {
        console.error('[Media] Stream error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream media' });
        }
    }
});

export default router;
