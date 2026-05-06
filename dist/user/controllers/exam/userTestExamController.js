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
exports.getDebugVersion = exports.getParticipantsByPaperId = exports.updateUserTestExam = exports.createUserTestExam = exports.getUserTestExamByPaperId = exports.getUserTestExams = void 0;
const userTestExamModel_1 = require("../../../models/exam/userTestExamModel");
const objectiveModel_1 = require("../../../models/exam/objectiveModel");
const userObjectiveModel_1 = require("../../../models/exam/userObjectiveModel");
const examModel_1 = require("../../../models/exam/examModel");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// In-memory map to store timer handles for active exam sessions
const activeTimers = new Map();
/**
 * Shared logic to calculate and save exam results
 */
const calculateAndSaveScore = (userId, paperId, userExamId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const debugFile = path_1.default.join(process.cwd(), 'debug_scoring.log');
        fs_1.default.appendFileSync(debugFile, `\n[${new Date().toISOString()}] TRIGGERED SCRORING for User: ${userId}, Exam: ${userExamId}\n`);
        // 1. Fetch all UserObjectives for this session
        const userObjectives = yield userObjectiveModel_1.UserObjective.find({ bioUserId: userId, paperId });
        // 2. Calculate metrics with extreme precision
        const currentExam = yield userTestExamModel_1.UserTestExam.findById(userExamId);
        const started = (currentExam === null || currentExam === void 0 ? void 0 : currentExam.started) || Date.now();
        const ended = Date.now();
        const durationInMs = ended - started;
        const durationSeconds = Math.max(1, Math.floor(durationInMs / 1000));
        // CRITICAL FIX: If userObjectives is empty, something is wrong with the seeding or the query.
        // We fetch the count from the template as a fallback.
        let totalQuestions = userObjectives.length;
        if (totalQuestions === 0) {
            totalQuestions = yield objectiveModel_1.Objective.countDocuments({ paperId });
        }
        const totalAttempted = userObjectives.filter(uo => uo.isClicked).length;
        const totalCorrect = userObjectives.filter(uo => {
            const selectedOption = (uo.options || []).find((opt) => opt.isClicked);
            return selectedOption && selectedOption.isSelected;
        }).length;
        // Formula: Rate = Attempted / Duration
        const calcRate = totalAttempted / durationSeconds;
        // Formula: Accuracy = (Correct / Total) * 100
        const calcAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
        // Formula: Metric = Rate * (Correct / Total)
        const accuracyDecimal = totalQuestions > 0 ? (totalCorrect / totalQuestions) : 0;
        const calcMetric = calcRate * accuracyDecimal;
        console.log("calcMetric", calcRate);
        const debugMsg = `--- Scoring Diagnostic ---
ExamID: ${userExamId}
PaperID: ${paperId}
RAW -> Correct: ${totalCorrect}, Attempted: ${totalAttempted}, TemplateTotal: ${totalQuestions}, Duration: ${durationSeconds}s
FINAL -> Rate: ${calcRate} Q/s, Accuracy: ${calcAccuracy}%, Metric: ${calcMetric}
-------------------------`;
        fs_1.default.appendFileSync(debugFile, debugMsg + '\n');
        console.log(debugMsg);
        // 3. Check if this is the first time the user is completing this exam
        const isFirstCompletion = !(currentExam === null || currentExam === void 0 ? void 0 : currentExam.ended) || currentExam.ended === 0;
        // 4. Update the UserTestExam record
        const updatedRecord = yield userTestExamModel_1.UserTestExam.findOneAndUpdate({ _id: userExamId, bioUserId: userId }, {
            $set: {
                isActive: false,
                ended,
                totalCorrectAnswer: totalCorrect,
                attemptedQuestions: totalAttempted,
                questions: totalQuestions,
                accuracy: calcAccuracy,
                rate: calcRate,
                metric: calcMetric
            }
        }, { new: true });
        // 5. Increment exam's participant count on first completion
        if (isFirstCompletion && paperId) {
            yield examModel_1.Exam.findByIdAndUpdate(paperId, { $inc: { participants: 1 } });
        }
        console.log(`[Scoring] Record Updated: ${updatedRecord === null || updatedRecord === void 0 ? void 0 : updatedRecord._id}, Rate: ${updatedRecord === null || updatedRecord === void 0 ? void 0 : updatedRecord.rate}`);
        activeTimers.delete(userExamId);
        return updatedRecord;
    }
    catch (error) {
        console.error(`Error auto-scoring exam ${userExamId}:`, error);
        return null;
    }
});
/**
 * Helper function to seed user objectives if they don't exist
 */
const seedUserObjectives = (userId_1, paperId_1, ...args_1) => __awaiter(void 0, [userId_1, paperId_1, ...args_1], void 0, function* (userId, paperId, force = false) {
    try {
        // 1. If force reset is requested, delete old ones
        if (force) {
            yield userObjectiveModel_1.UserObjective.deleteMany({ bioUserId: userId, paperId });
        }
        else {
            // Otherwise, only seed if none exist
            const existingCount = yield userObjectiveModel_1.UserObjective.countDocuments({ bioUserId: userId, paperId });
            if (existingCount > 0)
                return;
        }
        // 2. Fetch all template objectives for this paper
        const templateObjectives = yield objectiveModel_1.Objective.find({ paperId }).sort({ index: 1 });
        if (templateObjectives.length === 0)
            return;
        // 3. Prepare user objectives for bulk insertion
        const userObjectivesData = templateObjectives.map(obj => ({
            bioUserId: userId,
            paperId,
            objectiveId: obj._id,
            question: obj.question,
            options: obj.options,
            isClicked: false,
            isCorrect: false
        }));
        // 4. Bulk insert
        yield userObjectiveModel_1.UserObjective.insertMany(userObjectivesData);
    }
    catch (error) {
        console.error('Error seeding user objectives:', error);
        // We don't throw here to avoid failing the whole exam start, 
        // but in a production environment we might want more robust error handling.
    }
});
/**
 * @desc    Get all user exam records for the authenticated user
 * @route   GET /api/exams/user-exams
 * @access  Private
 */
const getUserTestExams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const userExams = yield userTestExamModel_1.UserTestExam.find({ bioUserId: userId }).sort({ createdAt: -1 });
        res.status(200).json(userExams);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
exports.getUserTestExams = getUserTestExams;
/**
 * @desc    Get a specific user exam record by paperId for the authenticated user
 * @route   GET /api/exams/user-exams/:paperId
 * @access  Private
 */
const getUserTestExamByPaperId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const paperId = req.params.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const userExam = yield userTestExamModel_1.UserTestExam.findOne({ bioUserId: userId, paperId });
        if (!userExam) {
            return res.status(404).json({ message: 'User exam record not found' });
        }
        // 1. If the exam is NOT active
        if (userExam.isActive === false) {
            const isReviewMode = userExam.ended > 0;
            const templateObjectives = yield objectiveModel_1.Objective.find({ paperId }).sort({ index: 1 });
            const processedObjectives = templateObjectives.map(obj => {
                if (isReviewMode) {
                    return Object.assign(Object.assign({}, obj.toObject()), { isClicked: false, isAnswered: false, options: obj.options.map((opt) => (Object.assign(Object.assign({}, opt.toObject ? opt.toObject() : opt), { isClicked: false }))) });
                }
                else {
                    return Object.assign(Object.assign({}, obj.toObject()), { question: "HIDDEN_CONTENT: Click Start to view question", isClicked: false, isAnswered: false, options: obj.options.map((opt) => (Object.assign(Object.assign({}, opt.toObject ? opt.toObject() : opt), { value: "HIDDEN_OPTION", isClicked: false }))) });
                }
            });
            const lastUserObjectives = isReviewMode
                ? yield userObjectiveModel_1.UserObjective.find({ bioUserId: userId, paperId })
                : [];
            return res.status(200).json(Object.assign(Object.assign({}, userExam.toObject()), { objectives: processedObjectives, lastUserObjectives }));
        }
        // 2. If the exam IS active, return user objectives for resume
        const userObjectives = yield userObjectiveModel_1.UserObjective.find({
            bioUserId: userId,
            paperId
        });
        res.status(200).json(Object.assign(Object.assign({}, userExam.toObject()), { userObjectives }));
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
exports.getUserTestExamByPaperId = getUserTestExamByPaperId;
/**
 * @desc    Create a new user exam record
 * @route   POST /api/exams/user-exams
 * @access  Private
 */
const createUserTestExam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const paperId = req.body.paperId;
        const totalQuestions = paperId ? yield objectiveModel_1.Objective.countDocuments({ paperId }) : 0;
        const examData = Object.assign(Object.assign({}, req.body), { questions: totalQuestions, bioUserId: userId, attempts: req.body.isActive ? 1 : 0 });
        const newUserExam = yield userTestExamModel_1.UserTestExam.create(examData);
        let objectives = [];
        // Handle objectives seeding and response
        if (newUserExam.paperId) {
            const templateObjectives = yield objectiveModel_1.Objective.find({ paperId: newUserExam.paperId }).sort({ index: 1 });
            if (newUserExam.isActive) {
                yield seedUserObjectives(userId, newUserExam.paperId, true);
                objectives = templateObjectives.map(obj => (Object.assign(Object.assign({}, obj.toObject()), { isClicked: false, isAnswered: false, options: obj.options.map((opt) => (Object.assign(Object.assign({}, opt), { isClicked: false }))) })));
                // Set server-side auto-scoring timer
                const durationMs = (newUserExam.duration || 60) * 60000;
                const timerHandle = setTimeout(() => {
                    calculateAndSaveScore(userId, newUserExam.paperId, String(newUserExam._id));
                }, durationMs);
                activeTimers.set(String(newUserExam._id), timerHandle);
            }
            else {
                // Mask content if not active
                objectives = templateObjectives.map(obj => (Object.assign(Object.assign({}, obj.toObject()), { question: "HIDDEN_CONTENT: Click Start to view question", isClicked: false, isAnswered: false, options: obj.options.map((opt) => (Object.assign(Object.assign({}, opt.toObject ? opt.toObject() : opt), { value: "HIDDEN_OPTION", isClicked: false }))) })));
            }
        }
        res.status(201).json(Object.assign(Object.assign({}, newUserExam.toObject()), { objectives }));
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.createUserTestExam = createUserTestExam;
/**
 * @desc    Update an existing user exam record
 * @route   PATCH /api/exams/user-exams/:id
 * @access  Private
 */
const updateUserTestExam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const id = req.params.id;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        console.log(`[Diagnostic] UPDATE Exam Request Body: ${JSON.stringify(req.body)}`);
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const currentExam = yield userTestExamModel_1.UserTestExam.findOne({ _id: id, bioUserId: userId });
        if (!currentExam) {
            return res.status(404).json({ message: 'User exam record not found' });
        }
        // 0. Check if the test has already been scored
        if (currentExam.isActive === false && req.body.isActive === false) {
            return res.status(200).json(Object.assign(Object.assign({}, currentExam.toObject()), { message: 'This test has already been scored.' }));
        }
        const updateData = Object.assign({}, req.body);
        const mongoUpdate = { $set: updateData };
        // 1. If STARTING or RESUMING the exam
        if (req.body.isActive === true) {
            // Fetch total questions count from template to ensure it's not 0
            const totalQuestions = yield objectiveModel_1.Objective.countDocuments({ paperId: currentExam.paperId });
            mongoUpdate.$set.questions = totalQuestions;
            // Increment attempts on every fresh start (when started timestamp is provided or switching from inactive)
            if (!currentExam.isActive || req.body.started) {
                mongoUpdate.$inc = { attempts: 1 };
            }
            const updatedUserExam = yield userTestExamModel_1.UserTestExam.findOneAndUpdate({ _id: id, bioUserId: userId }, mongoUpdate, { new: true, runValidators: true });
            if (updatedUserExam && updatedUserExam.paperId) {
                // Force seed only if it's a "restart" (going from inactive to active)
                const isRestart = currentExam.isActive === false;
                yield seedUserObjectives(userId, updatedUserExam.paperId, isRestart);
                // Clear any existing timer just in case
                if (activeTimers.has(id)) {
                    clearTimeout(activeTimers.get(id));
                    activeTimers.delete(id);
                }
                // Set server-side auto-scoring timer based on remaining time
                const durationMs = (updatedUserExam.duration || 60) * 60000;
                const startTime = updatedUserExam.started || Date.now();
                const elapsed = Date.now() - startTime;
                const remaining = durationMs - elapsed;
                if (remaining > 0) {
                    const timerHandle = setTimeout(() => {
                        calculateAndSaveScore(userId, updatedUserExam.paperId, id);
                    }, remaining);
                    activeTimers.set(id, timerHandle);
                }
                else {
                    // Time already up! Score it now.
                    yield calculateAndSaveScore(userId, updatedUserExam.paperId, id);
                }
                // Fetch clean template objectives for the client (Ensure fresh UI)
                const templateObjectives = yield objectiveModel_1.Objective.find({ paperId: updatedUserExam.paperId }).sort({ index: 1 });
                const objectives = templateObjectives.map(obj => (Object.assign(Object.assign({}, obj.toObject()), { isClicked: false, isAnswered: false, options: obj.options.map((opt) => (Object.assign(Object.assign({}, opt), { isClicked: false }))) })));
                return res.status(200).json(Object.assign(Object.assign({}, updatedUserExam.toObject()), { objectives }));
            }
        }
        // 2. If STOPPING or SUBMITTING (Manual)
        if (req.body.isActive === false) {
            // Clear active timer
            if (activeTimers.has(id)) {
                clearTimeout(activeTimers.get(id));
                activeTimers.delete(id);
            }
            // Use the shared scoring function
            const scoredRecord = yield calculateAndSaveScore(userId, currentExam.paperId, id);
            // Return objectives as well for immediate client update
            if (scoredRecord) {
                const userObjectives = yield userObjectiveModel_1.UserObjective.find({ bioUserId: userId, paperId: currentExam.paperId });
                return res.status(200).json(Object.assign(Object.assign({}, scoredRecord.toObject()), { userObjectives }));
            }
        }
        // 3. General updates (no state change)
        // PROTECT METRICS: If the user is sending metric fields but NOT finishing (isActive: false), 
        // we strip them to prevent accidental overwrites with preliminary or incorrect data.
        if (req.body.isActive !== false) {
            delete mongoUpdate.$set.rate;
            delete mongoUpdate.$set.accuracy;
            delete mongoUpdate.$set.metric;
        }
        const finalUpdate = yield userTestExamModel_1.UserTestExam.findOneAndUpdate({ _id: id, bioUserId: userId }, mongoUpdate, { new: true, runValidators: true });
        res.status(200).json(finalUpdate);
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
});
exports.updateUserTestExam = updateUserTestExam;
/**
 * @desc    Get all finished participants for a specific paper, sorted by metric
 * @route   GET /api/exams/user-exams/paper/:id/participants
 * @access  Private
 */
const getParticipantsByPaperId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: paperId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search;
        const skip = (page - 1) * limit;
        const query = {
            paperId: String(paperId),
            $or: [
                { isActive: false },
                { ended: { $gt: 0 } },
                { metric: { $gt: 0 } }
            ]
        };
        if (search) {
            query.bioUserDisplayName = { $regex: search, $options: 'i' };
        }
        const participants = yield userTestExamModel_1.UserTestExam.find(query)
            .sort({ metric: -1 })
            .skip(skip)
            .limit(limit)
            .select('bioUserUsername bioUserDisplayName bioUserPicture metric started ended totalCorrectAnswer attemptedQuestions accuracy rate attempts');
        res.status(200).json(participants);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
exports.getParticipantsByPaperId = getParticipantsByPaperId;
const getDebugVersion = (req, res) => {
    res.status(200).json({ version: "2026-03-14-T16-20", message: "API is updated - Precision Scoring Active" });
};
exports.getDebugVersion = getDebugVersion;
