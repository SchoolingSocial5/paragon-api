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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaProcessingService = void 0;
const client_mediaconvert_1 = require("@aws-sdk/client-mediaconvert");
/**
 * Service to handle post-upload media processing using AWS Elemental MediaConvert.
 * This is the "Option 2" (Production/Scalable) approach.
 * It offloads CPU-intensive video transcoding to AWS, keeping your Render API fast.
 */
class MediaProcessingService {
    /**
     * Triggers a MediaConvert job for an uploaded video.
     * @param key S3 key of the source video (e.g. "posts/uuid.mp4")
     * @param userMetadata Optional metadata passed through to the job completion event
     * @returns The MediaConvert Job ID, or undefined on failure
     */
    static processVideo(key, userMetadata) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const bucketName = process.env.AWS_S3_BUCKET_NAME;
            const roleArn = process.env.AWS_MEDIACONVERT_ROLE_ARN;
            if (!bucketName || !roleArn || !process.env.AWS_MEDIACONVERT_ENDPOINT) {
                console.error('[MediaProcessing] Missing required MediaConvert environment variables.');
                return;
            }
            const inputPath = `s3://${bucketName}/${key}`;
            const outputKeyPrefix = key.replace(/\.(mp4|mov|avi|mkv)$/i, '');
            const outputPath = `s3://${bucketName}/${outputKeyPrefix}/master`;
            try {
                console.log(`[MediaProcessing] Submitting MediaConvert job for: ${key}`);
                const command = new client_mediaconvert_1.CreateJobCommand({
                    Role: roleArn,
                    // inputKey is used by the mediaconvert-callback endpoint to find and update the post
                    UserMetadata: Object.assign({ inputKey: key }, userMetadata),
                    Settings: {
                        Inputs: [{
                                FileInput: inputPath,
                                AudioSelectors: { "Audio Selector 1": { DefaultSelection: "DEFAULT" } },
                                VideoSelector: {},
                                TimecodeSource: "EMBEDDED",
                            }],
                        OutputGroups: [
                            {
                                Name: "HLS Group",
                                OutputGroupSettings: {
                                    Type: "HLS_GROUP_SETTINGS",
                                    HlsGroupSettings: {
                                        Destination: outputPath,
                                        SegmentLength: 4,
                                        MinSegmentLength: 1,
                                    }
                                },
                                Outputs: [
                                    // 720p
                                    {
                                        VideoDescription: {
                                            Width: 1280,
                                            Height: 720,
                                            CodecSettings: {
                                                Codec: "H_264",
                                                H264Settings: {
                                                    MaxBitrate: 2500000,
                                                    RateControlMode: "QVBR",
                                                    SceneChangeDetect: "ENABLED",
                                                    GopSize: 2.0,
                                                    GopSizeUnits: "SECONDS",
                                                }
                                            }
                                        },
                                        AudioDescriptions: [{
                                                CodecSettings: {
                                                    Codec: "AAC",
                                                    AacSettings: {
                                                        Bitrate: 128000,
                                                        CodingMode: "CODING_MODE_2_0",
                                                        SampleRate: 48000
                                                    }
                                                }
                                            }],
                                        OutputSettings: {
                                            HlsSettings: {
                                                AudioGroupId: "program_audio",
                                                IFrameOnlyManifest: "EXCLUDE"
                                            }
                                        },
                                        ContainerSettings: { Container: "M3U8" },
                                        NameModifier: "_720p"
                                    },
                                    // 480p
                                    {
                                        VideoDescription: {
                                            Width: 854,
                                            Height: 480,
                                            CodecSettings: {
                                                Codec: "H_264",
                                                H264Settings: {
                                                    MaxBitrate: 1200000,
                                                    RateControlMode: "QVBR",
                                                    SceneChangeDetect: "ENABLED",
                                                    GopSize: 2.0,
                                                    GopSizeUnits: "SECONDS",
                                                }
                                            }
                                        },
                                        AudioDescriptions: [{
                                                CodecSettings: {
                                                    Codec: "AAC",
                                                    AacSettings: {
                                                        Bitrate: 96000,
                                                        CodingMode: "CODING_MODE_2_0",
                                                        SampleRate: 48000
                                                    }
                                                }
                                            }],
                                        OutputSettings: {
                                            HlsSettings: {
                                                AudioGroupId: "program_audio",
                                                IFrameOnlyManifest: "EXCLUDE"
                                            }
                                        },
                                        ContainerSettings: { Container: "M3U8" },
                                        NameModifier: "_480p"
                                    },
                                    // 360p
                                    {
                                        VideoDescription: {
                                            Width: 640,
                                            Height: 360,
                                            CodecSettings: {
                                                Codec: "H_264",
                                                H264Settings: {
                                                    MaxBitrate: 800000,
                                                    RateControlMode: "QVBR",
                                                    SceneChangeDetect: "ENABLED",
                                                    GopSize: 2.0,
                                                    GopSizeUnits: "SECONDS",
                                                }
                                            }
                                        },
                                        AudioDescriptions: [{
                                                CodecSettings: {
                                                    Codec: "AAC",
                                                    AacSettings: {
                                                        Bitrate: 64000,
                                                        CodingMode: "CODING_MODE_2_0",
                                                        SampleRate: 48000
                                                    }
                                                }
                                            }],
                                        OutputSettings: {
                                            HlsSettings: {
                                                AudioGroupId: "program_audio",
                                                IFrameOnlyManifest: "EXCLUDE"
                                            }
                                        },
                                        ContainerSettings: { Container: "M3U8" },
                                        NameModifier: "_360p"
                                    }
                                ]
                            }
                        ]
                    }
                });
                const response = yield this.mcClient.send(command);
                const jobId = (_a = response.Job) === null || _a === void 0 ? void 0 : _a.Id;
                console.log(`[MediaProcessing] MediaConvert job created: ${jobId}`);
                return jobId;
            }
            catch (error) {
                console.error(`[MediaProcessing] Failed to create MediaConvert job for ${key}:`, error);
            }
        });
    }
}
exports.MediaProcessingService = MediaProcessingService;
MediaProcessingService.mcClient = new client_mediaconvert_1.MediaConvertClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_MEDIACONVERT_ENDPOINT, // e.g. https://xyz.mediaconvert.us-east-1.amazonaws.com
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
