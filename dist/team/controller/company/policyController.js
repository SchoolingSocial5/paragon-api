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
exports.deletePolicy = exports.updatePolicy = exports.getPolicyById = exports.createPolicy = exports.getPolicies = void 0;
const policyModel_1 = require("../../../models/company/policyModel");
// @desc    Get all policies
// @route   GET /api/team/policies
// @access  Private/Staff
const getPolicies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const policies = yield policyModel_1.Policy.find({}).sort({ createdAt: -1 });
        res.json(policies);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPolicies = getPolicies;
// @desc    Create a new policy
// @route   POST /api/team/policies
// @access  Private/Staff
const createPolicy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, title, content, category } = req.body;
        const policy = yield policyModel_1.Policy.create({
            name,
            title,
            content,
            category
        });
        res.status(201).json(policy);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createPolicy = createPolicy;
// @desc    Get a single policy by ID
// @route   GET /api/team/policies/:id
// @access  Private/Staff
const getPolicyById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const policy = yield policyModel_1.Policy.findById(req.params.id);
        if (policy) {
            res.json(policy);
        }
        else {
            res.status(404).json({ message: 'Policy not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPolicyById = getPolicyById;
// @desc    Update a policy
// @route   PUT /api/team/policies/:id
// @access  Private/Staff
const updatePolicy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const policy = yield policyModel_1.Policy.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (policy) {
            res.json(policy);
        }
        else {
            res.status(404).json({ message: 'Policy not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updatePolicy = updatePolicy;
// @desc    Delete a policy
// @route   DELETE /api/team/policies/:id
// @access  Private/Staff
const deletePolicy = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const policy = yield policyModel_1.Policy.findByIdAndDelete(req.params.id);
        if (policy) {
            res.json({ message: 'Policy removed' });
        }
        else {
            res.status(404).json({ message: 'Policy not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deletePolicy = deletePolicy;
