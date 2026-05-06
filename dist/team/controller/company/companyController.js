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
exports.updateCompany = exports.getCompany = void 0;
const companyModel_1 = require("../../../models/company/companyModel");
// @desc    Get company details (first record)
// @route   GET /api/team/company
// @access  Private/Staff
const getCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let company = yield companyModel_1.Company.findOne({});
        // If no company exists, create a default one
        if (!company) {
            company = yield companyModel_1.Company.create({
                name: "Schooling Social",
                allowSignUp: true
            });
        }
        res.json(company);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getCompany = getCompany;
// @desc    Update company details
// @route   PUT /api/team/company
// @access  Private/Staff
const updateCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let company = yield companyModel_1.Company.findOne({});
        if (!company) {
            company = new companyModel_1.Company(req.body);
            yield company.save();
        }
        else {
            company = yield companyModel_1.Company.findOneAndUpdate({}, req.body, { new: true, runValidators: true });
        }
        res.json(company);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateCompany = updateCompany;
