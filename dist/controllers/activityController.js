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
exports.getActivities = exports.createActivity = void 0;
const app_1 = require("../app");
const activityModel_1 = require("../models/activityModel");
const errorHandler_1 = require("../utils/errorHandler");
const query_1 = require("../utils/query");
const createActivity = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const form = data.form;
        const activity = yield activityModel_1.Activity.create({
            staffName: form.staffName,
            staffUsername: form.staffUsername,
            page: form.page,
            createdAt: form.createdAt,
        });
        const count = yield activityModel_1.Activity.countDocuments();
        app_1.io.emit(`admin`, {
            activity,
            count,
        });
    }
    catch (error) {
        console.log(error);
    }
});
exports.createActivity = createActivity;
const getActivities = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, query_1.queryData)(activityModel_1.Activity, req);
        res.status(200).json(result);
    }
    catch (error) {
        (0, errorHandler_1.handleError)(res, undefined, undefined, error);
    }
});
exports.getActivities = getActivities;
