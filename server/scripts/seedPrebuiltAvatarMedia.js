#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const REQUIRED_STATES = ['happy', 'sad', 'sleepy'];
const DEFAULT_CONFIG_PATH = path.resolve(__dirname, 'prebuilt-avatar-seed.json');

function parseArgs(argv) {
    let configPath = DEFAULT_CONFIG_PATH;
    let dryRun = false;

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--config' || arg === '-c') {
            configPath = argv[i + 1] ? path.resolve(argv[i + 1]) : configPath;
            i += 1;
            continue;
        }
        if (arg === '--dry-run') {
            dryRun = true;
            continue;
        }
        if (arg === '--help' || arg === '-h') {
            console.log('Usage: node scripts/seedPrebuiltAvatarMedia.js --config /absolute/path/to/config.json [--dry-run]');
            process.exit(0);
        }
    }

    return { configPath, dryRun };
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolvePath(inputPath, configDir) {
    if (!inputPath || typeof inputPath !== 'string') {
        throw new Error('Invalid empty file path');
    }
    return path.isAbsolute(inputPath) ? inputPath : path.resolve(configDir, inputPath);
}

function mimeTypeFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const map = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.m4v': 'video/x-m4v',
    };
    return map[ext] || 'application/octet-stream';
}

function fileToDataUri(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const data = fs.readFileSync(filePath);
    const mimeType = mimeTypeFromPath(filePath);
    return {
        mimeType,
        dataUri: `data:${mimeType};base64,${data.toString('base64')}`,
        bytes: data.length,
    };
}

function ensureRequiredStateFiles(userEntry) {
    if (!userEntry.animations || typeof userEntry.animations !== 'object') {
        throw new Error('Missing "animations" object');
    }
    for (const state of REQUIRED_STATES) {
        if (!userEntry.animations[state]) {
            throw new Error(`Missing animations.${state} path`);
        }
    }
}

async function findUser(usersCollection, userEntry) {
    const filters = [];
    if (typeof userEntry.email === 'string' && userEntry.email.trim()) {
        filters.push({ email: userEntry.email.trim().toLowerCase() });
    }
    if (typeof userEntry.name === 'string' && userEntry.name.trim()) {
        filters.push({ name: new RegExp(`^${escapeRegex(userEntry.name.trim())}$`, 'i') });
    }

    if (filters.length === 0) {
        throw new Error('Each user requires at least one identity field: email or name');
    }

    if (filters.length === 1) {
        return usersCollection.findOne(filters[0]);
    }
    return usersCollection.findOne({ $or: filters });
}

function formatIdentity(userEntry) {
    const idParts = [];
    if (userEntry.name) idParts.push(`name="${userEntry.name}"`);
    if (userEntry.email) idParts.push(`email="${userEntry.email}"`);
    return idParts.join(', ') || 'unknown';
}

async function seedUser({
    usersCollection,
    avatarsCollection,
    animationsCollection,
    userEntry,
    configDir,
    dryRun,
}) {
    ensureRequiredStateFiles(userEntry);
    const identity = formatIdentity(userEntry);
    const dbUser = await findUser(usersCollection, userEntry);
    if (!dbUser) {
        console.warn(`- Skipping ${identity}: user not found in database`);
        return { updated: false, reason: 'missing_user' };
    }

    const avatarPath = resolvePath(userEntry.avatarImagePath, configDir);
    const avatarAsset = fileToDataUri(avatarPath);
    const profilePath = userEntry.profilePhotoPath
        ? resolvePath(userEntry.profilePhotoPath, configDir)
        : null;
    if (profilePath && !fs.existsSync(profilePath)) {
        throw new Error(`Profile photo file not found: ${profilePath}`);
    }

    const animationAssets = {};
    for (const state of REQUIRED_STATES) {
        const videoPath = resolvePath(userEntry.animations[state], configDir);
        animationAssets[state] = {
            path: videoPath,
            ...fileToDataUri(videoPath),
        };
    }

    const now = new Date();
    const avatarFingerprint = crypto
        .createHash('sha256')
        .update(avatarAsset.dataUri)
        .digest('hex');
    const durationSeconds = Number.isFinite(Number(userEntry.durationSeconds))
        ? Math.max(3, Math.min(10, Math.trunc(Number(userEntry.durationSeconds))))
        : 5;

    if (dryRun) {
        console.log(`- [DRY RUN] ${identity} -> userId=${dbUser._id}`);
        console.log(`  avatar: ${avatarPath} (${Math.round(avatarAsset.bytes / 1024)}KB)`);
        console.log(`  states: ${REQUIRED_STATES.join(', ')} | duration=${durationSeconds}s`);
        return { updated: true };
    }

    await usersCollection.updateOne(
        { _id: dbUser._id },
        {
            $set: {
                profileImage: avatarAsset.dataUri,
                updatedAt: now,
            },
        }
    );

    await avatarsCollection.updateOne(
        { userId: dbUser._id },
        {
            $set: {
                userId: dbUser._id,
                avatarImageUrl: avatarAsset.dataUri,
                generationMetadata: {
                    provider: 'prebuilt_seed',
                    mode: 'prebuilt',
                    avatarFingerprint,
                    stylePreset: userEntry.stylePreset || 'prebuilt_demo_style_v1',
                    statesRequested: REQUIRED_STATES,
                    source: 'local_prebuilt_assets',
                    sourceAvatarPath: avatarPath,
                    sourceProfilePhotoPath: profilePath,
                    seededAt: now.toISOString(),
                },
                updatedAt: now,
            },
            $setOnInsert: {
                createdAt: now,
            },
        },
        { upsert: true }
    );

    for (const state of REQUIRED_STATES) {
        const asset = animationAssets[state];
        await animationsCollection.updateOne(
            { userId: dbUser._id, stateType: state },
            {
                $set: {
                    userId: dbUser._id,
                    stateType: state,
                    videoUrl: asset.dataUri,
                    duration: durationSeconds,
                    quality: 'high',
                    loopOptimized: true,
                    circularOptimized: true,
                    generationMetadata: {
                        provider: 'prebuilt_seed',
                        mode: 'prebuilt',
                        state,
                        avatarFingerprint,
                        sourceVideoPath: asset.path,
                        mimeType: asset.mimeType,
                        seededAt: now.toISOString(),
                    },
                    updatedAt: now,
                },
                $setOnInsert: {
                    createdAt: now,
                },
            },
            { upsert: true }
        );
    }

    await animationsCollection.deleteMany({
        userId: dbUser._id,
        stateType: { $nin: REQUIRED_STATES },
    });

    console.log(`- Seeded ${identity} -> userId=${dbUser._id}`);
    return { updated: true };
}

async function main() {
    const { configPath, dryRun } = parseArgs(process.argv.slice(2));
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is missing in server/.env');
    }
    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
    }

    const configDir = path.dirname(configPath);
    const rawConfig = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(rawConfig);
    const users = Array.isArray(config.users) ? config.users : [];
    if (users.length === 0) {
        throw new Error('Config must include a non-empty "users" array');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const avatarsCollection = db.collection('avatars');
    const animationsCollection = db.collection('avataranimations');

    console.log(`Seeding prebuilt avatar assets for ${users.length} user(s)...`);
    if (dryRun) {
        console.log('Dry run mode enabled: database will not be modified.');
    }

    let seededCount = 0;
    let skippedCount = 0;
    for (const userEntry of users) {
        try {
            const result = await seedUser({
                usersCollection,
                avatarsCollection,
                animationsCollection,
                userEntry,
                configDir,
                dryRun,
            });
            if (result.updated) seededCount += 1;
            else skippedCount += 1;
        } catch (error) {
            skippedCount += 1;
            console.error(`- Failed ${formatIdentity(userEntry)}:`, error.message);
        }
    }

    await mongoose.disconnect();
    console.log(`Done. Seeded: ${seededCount}, skipped: ${skippedCount}`);
}

main().catch(async (error) => {
    console.error('Prebuilt avatar seed failed:', error.message);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    process.exit(1);
});
