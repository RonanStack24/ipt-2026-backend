import { expressjwt as jwt } from 'express-jwt';
import config from '../config';
import db from '../_helpers/db';

const secret = config.secret;

export default function authorize(roles: any = []) {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        jwt({ secret, algorithms: ['HS256'], requestProperty: 'user' }),
        async (req: any, res: any, next: any) => {
            const account = await db.Account.findByPk(req.user.id);

            if (!account || (roles.length && !roles.includes(account.role))) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            req.user.role = account.role;
            const refreshTokens = await db.RefreshToken.findAll(
                { where: { accountId: account.id } });
            req.user.ownsToken = (token: any) => !!refreshTokens.find(
                (x: any) => x.token === token);
            next();
        }
    ];
}