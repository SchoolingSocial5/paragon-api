"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
console.log("Before dotenv.config()");
dotenv_1.default.config();
console.log("After dotenv.config()");
process.exit(0);
