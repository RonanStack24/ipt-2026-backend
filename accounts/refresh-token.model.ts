import { DataTypes } from "sequelize";

export default function model(sequelize: any) {
    const attributes = {
        token: { type: DataTypes.STRING },
        expires: { type: DataTypes.DATE },
        created: { type: DataTypes.DATE, allowedNull: false, defaultValue: DataTypes.NOW },
        createdByIp: { type: DataTypes.STRING },
        revoked: { type: DataTypes.DATE },
        revokedByIp: { type: DataTypes.STRING },
        replacedByToken: { type: DataTypes.STRING },
        isExpired: {
            type: DataTypes.VIRTUAL,
            get() { return new Date() >= new Date(this.expires); }
        },
        isActive: {
            type: DataTypes.VIRTUAL,
            get() { return !this.revoked && !this.isExpired; }
        }
    };
    const options = { timestamp: false };
    return sequelize.define('refreshToken', attributes, options);
}