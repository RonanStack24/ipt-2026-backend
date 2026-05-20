import config from '../config';
import mysql from 'mysql2/promise';
import { Sequelize } from 'sequelize';
import accountModel from '../accounts/account.model';
import refreshTokenModel from '../accounts/refresh-token.model';

const db: any = {};
export default db;

initialize();

async function initialize() {
    const { host, port, user, password, database } = config.database;
    const { DB_SSL, NODE_ENV } = process.env;

    const isProduction = NODE_ENV === 'production';

    if (!isProduction) {
        const connection = await mysql.createConnection({ host, port, user, password });
        // Create DB if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        await connection.end();
    }

    const dialectOptions: any = {};
    if (DB_SSL === 'true') {
        dialectOptions.ssl = { require: true, rejectUnauthorized: false };
    }

    // Connect to DB
    const sequelize = new Sequelize(database!, user!, password, { 
        dialect: 'mysql',
        host,
        port: Number(port),
        dialectOptions
    });

    // Init models
    db.Account = accountModel(sequelize);
    db.RefreshToken = refreshTokenModel(sequelize);
    // Define relationships
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);
    // Sync models with database
    await sequelize.sync();
}