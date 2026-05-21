import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import config from './config';
import errorHandler from './_middleware/error-handler';
import accountsController from './accounts/accounts.controller';
import swaggerDocs from './_helpers/swagger';

const app = express();

app.set('trust proxy', true);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// allow cors requests from any origin and with credentials
app.use(cors({ 
    origin: (origin, callback) => {
        const cleanCorsOrigin = (config.corsOrigin || "").replace(/\/$/, "");
        const allowedOrigins = [
            cleanCorsOrigin,
            "https://ipt-2026-frontend-yay2.onrender.com"
        ];
        
        const cleanOrigin = origin ? origin.replace(/\/$/, "") : "";
        
        if (!origin || allowedOrigins.includes(cleanOrigin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            console.warn(`CORS Warning: Origin ${origin} not explicitly allowed.`);
            callback(null, false); // Don't throw to prevent hanging the Express server
        }
    }, 
    credentials: true 
}));

app.use('/accounts', accountsController);

app.use('/api-docs', swaggerDocs);

// redirect / to /api-docs
app.get('/', (req, res) => res.redirect('/api-docs'));

app.use(errorHandler);

const port = config.port;
app.listen(port, () => console.log('Server listening on port ' + port));