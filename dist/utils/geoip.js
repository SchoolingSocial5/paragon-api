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
exports.geoipMiddleware = exports.getCountryFromIP = exports.initGeoIP = void 0;
const maxmind_1 = __importDefault(require("maxmind"));
const path_1 = __importDefault(require("path"));
let lookup;
const initGeoIP = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dbPath = path_1.default.resolve(__dirname, 'GeoLite2-Country.mmdb');
        lookup = yield maxmind_1.default.open(dbPath);
    }
    catch (error) {
        console.error('Failed to load GeoIP database:', error);
    }
});
exports.initGeoIP = initGeoIP;
const getCountryFromIP = (ip) => {
    var _a, _b;
    if (!lookup)
        return 'Unknown';
    try {
        // Handle IPv6 localhost and other edge cases
        const cleanIp = ip.replace('::ffff:', '').replace('::1', '127.0.0.1');
        const result = lookup.get(cleanIp);
        return ((_b = (_a = result === null || result === void 0 ? void 0 : result.country) === null || _a === void 0 ? void 0 : _a.names) === null || _b === void 0 ? void 0 : _b.en) || 'Unknown';
    }
    catch (error) {
        return 'Unknown';
    }
};
exports.getCountryFromIP = getCountryFromIP;
const geoipMiddleware = (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ipString = Array.isArray(ip) ? ip[0] : ip;
    // For local development, if IP is local, you might want to default to a specific country for testing
    let country = (0, exports.getCountryFromIP)(ipString);
    if (country === 'Unknown' && (ipString === '127.0.0.1' || ipString === '::1')) {
        country = 'Nigeria'; // Default for dev in user location
    }
    req.ipAddress = ipString;
    req.country = country;
    next();
};
exports.geoipMiddleware = geoipMiddleware;
