"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nosqlInjectionSentry = void 0;
const sanitize_1 = require("../utils/sanitize");
/**
 * Middleware to sanitize all incoming request data to prevent NoSQL injection.
 */
const nosqlInjectionSentry = (req, res, Next) => {
    if (req.body)
        (0, sanitize_1.sanitize)(req.body);
    if (req.query)
        (0, sanitize_1.sanitize)(req.query);
    if (req.params)
        (0, sanitize_1.sanitize)(req.params);
    Next();
};
exports.nosqlInjectionSentry = nosqlInjectionSentry;
