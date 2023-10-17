import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import sigUtil from '@metamask/eth-sig-util';
import { extractPublicKey, recoverPersonalSignature } from '@metamask/eth-sig-util';
import { keccak } from 'ethereumjs-util';
import jwt from 'jsonwebtoken';
import path from 'path';
import {IProfile} from "./model/IProfile";

// Define a custom interface that extends ExpressRequest
interface CustomRequest extends Request {
    senderAddress?: string;
}


const app = express();

app.use(bodyParser.json());

// Replace this with your own secret key (used to sign JWT tokens)
const secretKey = 'w87LqcTUMeA7U8v@#yEEZX2KfH@G9mWxxx';

// Mock user database (you should use a real database)
const users: string[] = [];
const profiles: Array<IProfile> = [];

/**
 * Helper function that generates the a JWT token
 * @param senderAddress, user's account address
 * @returns {string}
 */
function generateAuthToken(senderAddress: string): string {
    const token = jwt.sign({ senderAddress }, secretKey, { expiresIn: '1h' });
    return `Bearer ${token}`;
}

/**
 * This is a courtesy function that demonstrates
 * how to extract a sender's address from a public
 * key
 * @param hexPublicKey, the public key as a hexadecimal string
 * @returns {string} the sender's address as a hexadecimal string
 */
const getAddress = (hexPublicKey: string): string => {
    // Remove the '0x' prefix
    const publicKeyWithoutPrefix = hexPublicKey.slice(2);
    // Split the public key into X and Y coordinates (each coordinate is 64 characters)
    const xCoord = publicKeyWithoutPrefix.slice(0, 64);
    const yCoord = publicKeyWithoutPrefix.slice(64);
    // Concatenate the X and Y coordinates
    const concatenatedCoords = xCoord + yCoord;
    // Convert the concatenation to a buffer
    const bufferCoords = Buffer.from(concatenatedCoords, 'hex');
    // Hash the concatenated coordinates using Keccak-256
    const hashedCoords = keccak(bufferCoords, 256);
    // Convert the result to a hexadecimal string
    const hexString = '0x' + hashedCoords.toString('hex');
    // Slice off the last 40 hexadecimal characters which is the address
    return hexString.slice(-40);
};

/**
 * Verifies JWT token submitted in req.headers.authorization
 * @param req, HTTP Request in play
 * @param res, HTTP Response that will be emitted by app
 * @returns {Promise<userDate>}
 */
async function verifyJwtToken(req: CustomRequest, res: Response): Promise<any> {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) return res.status(401).json({ error: 'Authorization header missing' });

    const tokenParts = authorizationHeader.split(' ');

    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid Authorization header format' });
    }

    const jwtToken = tokenParts[1];
    let decoded;
    try {
        decoded = await jwt.verify(jwtToken, secretKey);
    } catch (e:any) {
        return res.status(401).json({ error: e.message });
    }
    // Access decoded data (user information)
    const userData = decoded;

    // Process the data as needed
    console.log('Decoded User Data:', userData);
    return userData;
}

/**
 * Middleware to verify MetaMask signature
 * @param req, HTTP Request in play
 * @param res, HTTP Response that will be emitted by app
 * @param next, the next middleware function to call
 * @returns {*} calls next() upon success, raises a 401 on failure
 */
function verifySignature(req: CustomRequest, res: Response, next: NextFunction): any {
    const { address, signature, message } = req.body;
    const publicKey = extractPublicKey({
        data: message,
        signature: signature,
    });
    // This is called for demonstration purposes
    const extractedAddress = getAddress(publicKey);
    console.log(`The sender's address is: ${extractedAddress}`);

    const senderAddress = recoverPersonalSignature({
        data: message,
        signature: signature,
    });
    if (senderAddress.toLowerCase() === address.toLowerCase()) {
        // store the user's address, if its not there already
        if (!users.includes(senderAddress.toLowerCase())) {
            // Add the user's address to the array simulating a DB.
            users.push(senderAddress.toLowerCase());
        }
        // Assert that the signature is valid
        req.senderAddress = senderAddress;
        return next();
    } else {
        return res.status(401).json({ error: 'Invalid signature' });
    }
}

/**
 * Route for handling profile request
 */
app.post('/profile', async (req: CustomRequest, res: Response) => {
    const tokenData = await verifyJwtToken(req, res);

    // Check if the user is already registered
    if (users.includes(tokenData.senderAddress.toLowerCase())) {
        // Use destructuring to get properties from req.body with defaults
        const { firstName = '', lastName = '', email = '' } = req.body;

        if (!profiles.some(obj => obj.address === tokenData.senderAddress)) {
            // Use the extracted properties
            profiles.push({
                address: tokenData.senderAddress,
                firstName,
                lastName,
                email
            });

            return res.status(200).json("ok");
        } else {
            return res.status(201).json("ok");
        }
    } else {
        // User is not registered, you may choose to register them
        return res.status(401).json({ error: 'Invalid authentication' });
    }
});

/**
 * Route for handling MetaMask login
 */
app.post('/profile', async (req: Request, res: Response) => {
    const tokenData = await verifyJwtToken(req, res);
    // Check if the user is already registered
    if (users.includes(tokenData.senderAddress.toLowerCase())) {
        const { firstName, lastName, email } = req.body;
        if (!profiles.some(obj => obj.address === tokenData.senderAddress)) {
            profiles.push({
                address: tokenData.senderAddress,
                firstName,
                lastName,
                email
            });
            return res.status(200).json("ok");
        } else {
            return res.status(201).json("ok");
        }
    } else {
        // User is not registered, you may choose to register them
        return res.status(401).json({ error: 'Invalid authentication' });
    }
});

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Define a route to serve the 'index.html' file
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3111;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
