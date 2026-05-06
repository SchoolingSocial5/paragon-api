"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSingleFile = exports.mediaConvertCallback = exports.notifyUploadComplete = exports.deleteMedia = exports.completeMultipart = exports.presignMultipartPart = exports.startMultipart = exports.getPresignedUrls = void 0;
const s3_1 = require("../../utils/s3");
const mediaProcessingService_1 = require("../../services/mediaProcessingService");
const postModel_1 = __importDefault(require("../../models/post/postModel"));
/**
 * @desc    Generate pre-signed URLs for media upload
 * @route   POST /api/upload/presigned
 * @access  Private
 */
const getPresignedUrls = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { files } = req.body; // Expecting [{ fileName: string, contentType: string }]
        if (!files || !Array.isArray(files) || files.length === 0) {
            res.status(400).json({ message: 'No files provided' });
            return;
        }
        const presignedData = yield Promise.all(files.map((file) => __awaiter(void 0, void 0, void 0, function* () {
            const { uploadUrl, key } = yield (0, s3_1.getPresignedUrl)(file.fileName, file.contentType);
            return {
                uploadUrl,
                key,
                resolvedUrl: (0, s3_1.getCloudFrontUrl)(key),
                fileName: file.fileName
            };
        })));
        res.json(presignedData);
    }
    catch (error) {
        console.error('Presigned URL Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.getPresignedUrls = getPresignedUrls;
/**
 * @desc    Start multipart upload
 * @route   POST /api/upload/multipart-start
 */
const startMultipart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fileName, contentType } = req.body;
        if (!fileName || !contentType) {
            res.status(400).json({ message: 'fileName and contentType are required' });
            return;
        }
        const data = yield (0, s3_1.startMultipartUpload)(fileName, contentType, 'posts');
        res.json(data);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.startMultipart = startMultipart;
/**
 * @desc    Get presigned URL for a chunk
 * @route   POST /api/upload/multipart-presign
 */
const presignMultipartPart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key, uploadId, partNumber, partNumbers } = req.body;
        const finalPartNumber = partNumber || (Array.isArray(partNumbers) ? partNumbers[0] : partNumbers);
        if (!key || !uploadId || !finalPartNumber) {
            res.status(400).json({ message: 'key, uploadId, and partNumber are required' });
            return;
        }
        const uploadUrl = yield (0, s3_1.getMultipartPreSignedUrl)(key, uploadId, Number(finalPartNumber));
        res.json({ uploadUrl });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.presignMultipartPart = presignMultipartPart;
/**
 * @desc    Complete multipart upload
 * @route   POST /api/upload/multipart-complete
 */
const completeMultipart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key, uploadId, parts } = req.body;
        if (!key || !uploadId || !parts || !Array.isArray(parts)) {
            res.status(400).json({ message: 'key, uploadId, and parts array are required' });
            return;
        }
        const url = yield (0, s3_1.completeMultipartUpload)(key, uploadId, parts);
        // Trigger processing if it's a video
        if (key.match(/\.(mp4|mov|avi|mkv)$/i)) {
            mediaProcessingService_1.MediaProcessingService.processVideo(key).catch(err => console.error('[MediaProcessing] Trigger failed:', err));
        }
        res.json({ url });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.completeMultipart = completeMultipart;
/**
 * @desc    Delete media from S3
 * @route   DELETE /api/upload/:key(*)
 * @access  Private
 */
const deleteMedia = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const key = req.params[0] || req.params.key;
        if (!key) {
            res.status(400).json({ message: 'No key provided' });
            return;
        }
        yield (0, s3_1.deleteFromS3)(key);
        res.json({ message: 'Media deleted successfully' });
    }
    catch (error) {
        console.error('Delete Media Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.deleteMedia = deleteMedia;
/**
 * @desc    Called by Flutter after a successful presigned S3 upload to trigger MediaConvert.
 *          Flutter should call this immediately after the PUT to S3 succeeds.
 * @route   POST /api/upload/notify
 * @access  Private
 * @body    { key: string }  — the S3 key returned by /upload/presigned
 */
const notifyUploadComplete = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.body;
        if (!key || typeof key !== 'string') {
            res.status(400).json({ message: 'key is required' });
            return;
        }
        if (!key.match(/\.(mp4|mov|avi|mkv)$/i)) {
            res.status(200).json({ message: 'Not a video, skipped' });
            return;
        }
        mediaProcessingService_1.MediaProcessingService.processVideo(key).catch(err => console.error('[notifyUploadComplete] MediaConvert trigger failed:', err));
        res.status(200).json({ message: 'Processing started' });
    }
    catch (error) {
        console.error('[notifyUploadComplete] Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.notifyUploadComplete = notifyUploadComplete;
/**
 * @desc    Webhook called by AWS EventBridge (via SNS HTTP subscription) when a
 *          MediaConvert job completes. Updates the matching post's hlsSource field.
 *
 *          AWS setup required:
 *          1. EventBridge rule: source=aws.mediaconvert, detail-type=MediaConvert Job State Change
 *          2. Rule target: SNS topic
 *          3. SNS topic: HTTP subscription to POST https://<your-api>/api/upload/mediaconvert-callback
 *          (Or use EventBridge API Destinations to call the endpoint directly.)
 *
 * @route   POST /api/upload/mediaconvert-callback
 * @access  Public (no auth — AWS SNS cannot send auth headers easily)
 */
const mediaConvertCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        // SNS sends Content-Type: text/plain so the route adds express.text({ type: '*/*' }).
        // req.body arrives as a raw JSON string — parse it here.
        let envelope;
        try {
            envelope = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        }
        catch (_e) {
            envelope = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        }
        // Auto-confirm SNS HTTP subscription (AWS sends this once when you create
        // the subscription; we must GET the SubscribeURL to activate it).
        if ((envelope === null || envelope === void 0 ? void 0 : envelope.Type) === 'SubscriptionConfirmation') {
            const subscribeUrl = envelope.SubscribeURL;
            if (subscribeUrl) {
                try {
                    yield fetch(subscribeUrl);
                    console.log('[MediaConvert Callback] SNS subscription confirmed');
                }
                catch (err) {
                    console.error('[MediaConvert Callback] Failed to confirm subscription:', err);
                }
            }
            res.status(200).send('Confirmed');
            return;
        }
        // Unwrap SNS Notification envelope: the actual EventBridge event is in Message (a JSON string).
        let event = envelope;
        if ((envelope === null || envelope === void 0 ? void 0 : envelope.Type) === 'Notification') {
            try {
                event = JSON.parse(envelope.Message);
            }
            catch (_f) {
                event = envelope;
            }
        }
        if ((event === null || event === void 0 ? void 0 : event['detail-type']) !== 'MediaConvert Job State Change') {
            res.status(200).json({ message: 'Ignored' });
            return;
        }
        const detail = (_b = event.detail) !== null && _b !== void 0 ? _b : {};
        if (detail.status !== 'COMPLETE') {
            res.status(200).json({ message: `Job status ${detail.status}, skipped` });
            return;
        }
        const inputKey = (_c = detail.userMetadata) === null || _c === void 0 ? void 0 : _c.inputKey;
        if (!inputKey) {
            console.warn('[MediaConvert Callback] No inputKey in userMetadata');
            res.status(200).json({ message: 'No inputKey' });
            return;
        }
        // Construct the HLS master manifest key — MediaConvert creates master.m3u8
        // at the Destination path: s3://bucket/<prefix>/master.m3u8
        const hlsKey = inputKey.replace(/\.(mp4|mov|avi|mkv)$/i, '') + '/master.m3u8';
        const hlsSource = (0, s3_1.getCloudFrontUrl)(hlsKey);
        // Find posts whose video source contains the input key (as a substring,
        // since source is stored as a full CloudFront URL).
        const escapedKey = inputKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const posts = yield postModel_1.default.find({
            'media.source': { $regex: escapedKey },
        });
        let updatedCount = 0;
        for (const post of posts) {
            let changed = false;
            for (const m of post.media) {
                if (m.type === 'video' && ((_d = m.source) === null || _d === void 0 ? void 0 : _d.includes(inputKey)) && !m.hlsSource) {
                    m.hlsSource = hlsSource;
                    changed = true;
                }
            }
            if (changed) {
                yield post.save();
                updatedCount++;
            }
        }
        console.log(`[MediaConvert Callback] Updated ${updatedCount} post(s) for key: ${inputKey} → ${hlsSource}`);
        res.status(200).json({ message: 'OK', updated: updatedCount });
    }
    catch (error) {
        console.error('[MediaConvert Callback] Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.mediaConvertCallback = mediaConvertCallback;
/**
 * @desc    Upload a single file to S3 and return the URL (mimicking chat mechanism)
 * @route   POST /api/upload/file
 * @access  Private
 */
const uploadSingleFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ message: 'No file provided' });
            return;
        }
        const folder = req.body.folder || 'posts';
        const url = yield (0, s3_1.uploadBufferToS3)(file.buffer, file.originalname, file.mimetype, folder);
        // Extract key from URL and trigger processing if it's a video
        if (file.mimetype.startsWith('video/')) {
            const key = url.split('/').pop();
            if (key) {
                mediaProcessingService_1.MediaProcessingService.processVideo(`${folder}/${key}`).catch(err => console.error('[MediaProcessing] Trigger failed:', err));
            }
        }
        res.status(201).json({ url });
    }
    catch (error) {
        console.error('Single Upload Error:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.uploadSingleFile = uploadSingleFile;
