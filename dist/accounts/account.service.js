"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../config"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
const send_email_1 = __importDefault(require("../_helpers/send-email"));
const db_1 = __importDefault(require("../_helpers/db"));
const role_1 = __importDefault(require("../_helpers/role"));
exports.default = {
    authenticate,
    refreshToken,
    revokeToken,
    register,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAll,
    getById,
    create,
    update,
    delete: _delete,
};
async function authenticate({ email, password, ipAddress }) {
    const account = await db_1.default.Account.scope("withHash").findOne({
        where: { email },
    });
    if (!account || !(await bcryptjs_1.default.compare(password, account.passwordHash))) {
        throw "Email or password is incorrect";
    }
    if (!account.isVerified) {
        throw "Account is not verified";
    }
    const jwtToken = generateJwtToken(account);
    const refreshToken = generateRefreshToken(account, ipAddress);
    await refreshToken.save();
    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: refreshToken.token,
    };
}
async function refreshToken({ token, ipAddress }) {
    console.log(`Attempting to refresh token: ${token} from IP: ${ipAddress}`);
    const refreshToken = await getRefreshToken(token);
    const account = await refreshToken.getAccount();
    console.log(`Token found for account: ${account.email}`);
    const newRefreshToken = generateRefreshToken(account, ipAddress);
    refreshToken.revoked = new Date();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();
    await newRefreshToken.save();
    const jwtToken = generateJwtToken(account);
    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: newRefreshToken.token,
    };
}
async function revokeToken({ token, ipAddress }) {
    console.log(`Revoking token: ${token} from IP: ${ipAddress}`);
    const refreshToken = await getRefreshToken(token);
    refreshToken.revoked = new Date();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
}
async function register(params, origin) {
    console.log(`Registering account: ${params.email}`);
    const existingAccount = await db_1.default.Account.findOne({
        where: { email: params.email },
    });
    if (existingAccount) {
        if (existingAccount.isVerified) {
            console.log(`Account already exists and is verified: ${params.email}, sending already registered email`);
            sendAlreadyRegisteredEmail(existingAccount.email, origin).catch((err) => console.error("Error sending already registered email:", err));
            return;
        }
        else {
            console.log(`Account already exists but is not verified: ${params.email}, resending verification email`);
            existingAccount.verificationToken =
                existingAccount.verificationToken || randomTokenString();
            await existingAccount.save();
            sendVerificationEmail(existingAccount, origin).catch((err) => console.error("Error resending verification email:", err));
            return;
        }
    }
    const account = new db_1.default.Account(params);
    const isFirstAccount = (await db_1.default.Account.count()) === 0;
    account.role = isFirstAccount ? role_1.default.Admin : role_1.default.User;
    account.verificationToken = randomTokenString();
    account.passwordHash = await hash(params.password);
    await account.save();
    sendVerificationEmail(account, origin).catch((err) => console.error("Error sending verification email during registration:", err));
}
async function verifyEmail({ token }) {
    console.log(`Verifying email with token: ${token}`);
    const account = await db_1.default.Account.findOne({
        where: { verificationToken: token },
    });
    if (!account) {
        console.error(`Verification failed: Invalid token ${token}`);
        throw "Verification failed";
    }
    account.verified = new Date();
    account.verificationToken = null;
    await account.save();
    console.log(`Account verified: ${account.email}`);
}
async function forgotPassword({ email }, origin) {
    const account = await db_1.default.Account.findOne({ where: { email } });
    if (!account)
        return;
    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await account.save();
    sendPasswordResetEmail(account, origin).catch((err) => console.error("Error sending password reset email:", err));
}
async function validateResetToken({ token }) {
    const account = await db_1.default.Account.findOne({
        where: {
            resetToken: token,
            resetTokenExpires: { [sequelize_1.Op.gt]: new Date() },
        },
    });
    if (!account)
        throw "Invalid token";
    return account;
}
async function resetPassword({ token, password }) {
    const account = await validateResetToken({ token });
    account.passwordHash = await hash(password);
    account.passwordReset = new Date();
    account.resetToken = null;
    await account.save();
}
async function getAll() {
    const accounts = await db_1.default.Account.findAll();
    return accounts.map((x) => basicDetails(x));
}
async function getById(id) {
    const account = await getAccount(id);
    return basicDetails(account);
}
async function create(params) {
    if (await db_1.default.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already registered';
    }
    const account = new db_1.default.Account(params);
    account.verified = new Date();
    account.passwordHash = await hash(params.password);
    await account.save();
    return basicDetails(account);
}
async function update(id, params) {
    const account = await getAccount(id);
    if (params.email &&
        account.email !== params.email &&
        (await db_1.default.Account.findOne({ where: { email: params.email } }))) {
        throw 'Email "' + params.email + '" is already taken';
    }
    if (params.password) {
        params.passwordHash = await hash(params.password);
    }
    Object.assign(account, params);
    account.updated = new Date();
    await account.save();
    return basicDetails(account);
}
async function _delete(id) {
    const account = await getAccount(id);
    await account.destroy();
}
async function getAccount(id) {
    const account = await db_1.default.Account.findByPk(id);
    if (!account)
        throw "Account not found";
    return account;
}
async function getRefreshToken(token) {
    const refreshToken = await db_1.default.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !refreshToken.isActive)
        throw "Invalid token";
    return refreshToken;
}
async function hash(password) {
    return await bcryptjs_1.default.hash(password, 10);
}
function generateJwtToken(account) {
    return jsonwebtoken_1.default.sign({ sub: account.id, id: account.id }, config_1.default.secret, {
        expiresIn: "15m",
    });
}
function generateRefreshToken(account, ipAddress) {
    return new db_1.default.RefreshToken({
        accountId: account.id,
        token: randomTokenString(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdByIp: ipAddress,
    });
}
function randomTokenString() {
    return crypto_1.default.randomBytes(40).toString("hex");
}
function basicDetails(account) {
    const { id, title, firstName, lastName, email, role, created, updated, isVerified, } = account;
    return {
        id,
        title,
        firstName,
        lastName,
        email,
        role,
        created,
        updated,
        isVerified,
    };
}
async function sendVerificationEmail(account, origin) {
    let message;
    if (origin) {
        const verifyUrl = `${config_1.default.frontendUrl || origin}/account/verify-email?token=${account.verificationToken}`;
        message = `<p>Please click the below link to verify your email address:</p>
                   <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
    }
    else {
        message = `<p>Please use the below token to verify your email address with the <code>/accounts/verify-email</code> api route:</p>
                   <p><code>${account.verificationToken}</code></p>`;
    }
    await (0, send_email_1.default)({
        to: account.email,
        subject: "Sign-up Verification API - Verify Email",
        html: `<h4>Verify Email</h4>
               <p>Thanks for registering!</p>
               ${message}`,
    });
}
async function sendAlreadyRegisteredEmail(email, origin) {
    let message;
    if (origin) {
        message = `<p>If you don't know your password please visit the <a href="${origin}/accounts/forgot-password">forgot password</a> page.</p>`;
    }
    else {
        message = `<p>If you don't know your password you can reset it via the <code>/accounts/forgot-password</code> api route.</p>`;
    }
    await (0, send_email_1.default)({
        to: email,
        subject: "Sign-up Verification API - Email Already Registered",
        html: `<h4>Email Already Registered</h4>
               <p>Your email <strong>${email}</strong> is already registered.</p>
               ${message}`,
    });
}
async function sendPasswordResetEmail(account, origin) {
    let message;
    if (origin) {
        const resetUrl = `${config_1.default.frontendUrl || origin}/account/reset-password?token=${account.resetToken}`;
        message = `<p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>`;
    }
    else {
        message = `<p>Please use the below token to reset your password with the <code>/accounts/reset-password</code> api route:</p>
                   <p><code>${account.resetToken}</code></p>`;
    }
    await (0, send_email_1.default)({
        to: account.email,
        subject: "Sign-up Verification API - Reset Password",
        html: `<h4>Reset Password Email</h4>
               ${message}`,
    });
}
