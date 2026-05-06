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
exports.deleteState = exports.deleteCountry = exports.updateState = exports.updateCountry = exports.createPlace = exports.getPlaces = void 0;
const placeModel_1 = require("../../../models/place/placeModel");
// @desc    Get all places (countries, states, areas) — with pagination & distinct support
// @desc    Get all places (countries, states, areas) — with pagination & distinct support
// @route   GET /api/places
// @access  Public
const getPlaces = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { country, state, search, distinct, page, limit, groupBy } = req.query;
        let query = {};
        if (country)
            query.country = country;
        if (state)
            query.state = state;
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { landmark: searchRegex },
                { area: searchRegex },
                { state: searchRegex },
                { country: searchRegex }
            ];
        }
        if (distinct) {
            const distinctValues = yield placeModel_1.Place.distinct(distinct, query);
            res.json(distinctValues);
            return;
        }
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        // If grouping by country, use aggregation for pagination
        if (groupBy === 'country') {
            const aggregate = [
                { $match: query },
                { $group: {
                        _id: "$country",
                        country: { $first: "$country" },
                        countryFlag: { $first: "$countryFlag" },
                        countryCode: { $first: "$countryCode" },
                        continent: { $first: "$continent" },
                        countryCapital: { $first: "$countryCapital" },
                        currency: { $first: "$currency" },
                        currencySymbol: { $first: "$currencySymbol" },
                        createdAt: { $first: "$createdAt" }
                    } },
                { $sort: { country: 1 } },
                { $facet: {
                        metadata: [{ $count: "total" }],
                        data: [{ $skip: skip }, { $limit: limitNum }]
                    } }
            ];
            const result = yield placeModel_1.Place.aggregate(aggregate);
            const data = result[0].data;
            const total = ((_a = result[0].metadata[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
            res.json({
                results: data,
                metadata: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            });
            return;
        }
        // If grouping by state, use aggregation for pagination
        if (groupBy === 'state') {
            const stateAggregate = [
                { $match: Object.assign(Object.assign({}, query), { state: { $exists: true, $nin: [null, ''] } }) },
                { $group: {
                        _id: "$state",
                        state: { $first: "$state" },
                        stateCapital: { $first: "$stateCapital" },
                        stateLogo: { $first: "$stateLogo" },
                        country: { $first: "$country" },
                        countryFlag: { $first: "$countryFlag" },
                        createdAt: { $first: "$createdAt" }
                    } },
                { $sort: { state: 1 } },
                { $facet: {
                        metadata: [{ $count: "total" }],
                        data: [{ $skip: skip }, { $limit: limitNum }]
                    } }
            ];
            const stateResult = yield placeModel_1.Place.aggregate(stateAggregate);
            const stateData = (_c = (_b = stateResult[0]) === null || _b === void 0 ? void 0 : _b.data) !== null && _c !== void 0 ? _c : [];
            const stateTotal = ((_e = (_d = stateResult[0]) === null || _d === void 0 ? void 0 : _d.metadata[0]) === null || _e === void 0 ? void 0 : _e.total) || 0;
            res.json({
                results: stateData,
                metadata: {
                    total: stateTotal,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(stateTotal / limitNum)
                }
            });
            return;
        }
        // If no aggregation/groupBy requested, handle normal places query
        const hasPagination = req.query.page || req.query.limit;
        if (!hasPagination) {
            const places = yield placeModel_1.Place.find(query).sort({ createdAt: -1 }).limit(1000);
            res.json(places);
            return;
        }
        const [places, total] = yield Promise.all([
            placeModel_1.Place.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
            placeModel_1.Place.countDocuments(query)
        ]);
        res.json({
            results: places,
            metadata: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getPlaces = getPlaces;
// @desc    Create a new place
// @route   POST /api/places
// @access  Private/Staff
const createPlace = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const place = yield placeModel_1.Place.create(req.body);
        res.status(201).json(place);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createPlace = createPlace;
// @desc    Update all records for a country
// @route   PUT /api/places/country/:name
// @access  Private/Staff
const updateCountry = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.params;
        const result = yield placeModel_1.Place.updateMany({ country: name }, req.body);
        res.json({ message: `Updated ${result.modifiedCount} records for country ${name}`, result });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateCountry = updateCountry;
// @desc    Update all records for a state
// @route   PUT /api/places/state/:name
// @access  Private/Staff
const updateState = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.params;
        const { country } = req.query;
        const query = { state: name };
        if (country)
            query.country = country;
        const result = yield placeModel_1.Place.updateMany(query, req.body);
        res.json({ message: `Updated ${result.modifiedCount} records for state ${name}`, result });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateState = updateState;
// @desc    Delete all records for a country
// @route   DELETE /api/places/country/:name
// @access  Private/Staff
const deleteCountry = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.params;
        const result = yield placeModel_1.Place.deleteMany({ country: name });
        res.json({ message: `Deleted ${result.deletedCount} records for country ${name}`, result });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.deleteCountry = deleteCountry;
// @desc    Delete all records for a state
// @route   DELETE /api/places/state/:name
// @access  Private/Staff
const deleteState = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.params;
        const { country } = req.query;
        const query = { state: name };
        if (country)
            query.country = country;
        const result = yield placeModel_1.Place.deleteMany(query);
        res.json({ message: `Deleted ${result.deletedCount} records for state ${name}`, result });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.deleteState = deleteState;
