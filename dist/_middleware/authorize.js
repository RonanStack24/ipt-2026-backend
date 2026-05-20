"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authorize;
const express_jwt_1 = require("express-jwt");
const config_1 = __importDefault(require("../config"));
const db_1 = __importDefault(require("../_helpers/db"));
const secret = config_1.default.secret;
function authorize(roles = []) {
    if (typeof roles === 'string') {
        roles = [roles];
    }
    return [
        (0, express_jwt_1.expressjwt)({ secret, algorithms: ['HS256'], requestProperty: 'user' }),
        async (req, res, next) => {
            const account = await db_1.default.Account.findByPk(req.user.id);
            if (!account || (roles.length && !roles.includes(account.role))) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            req.user.role = account.role;
            const refreshTokens = await db_1.default.RefreshToken.findAll({ where: { accountId: account.id } });
            req.user.ownsToken = (token) => !!refreshTokens.find((x) => x.token === token);
            next();
        }
    ];
}
