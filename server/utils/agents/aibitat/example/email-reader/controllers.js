const axios = require('axios');
const { createConfig } = require('./utils');
const nodemailer = require('nodemailer');
const CONSTANTS  = require('./constants');
const { google } = require('googleapis');

require("dotenv").config({ path: `../../../../../.env.development` });

const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

oAuth2Client.setCredentials({refresh_token: process.env.REFRESH_TOKEN});

async function sendMail(req, res){
    try{
        const accessToken = await oAuth2Client.getAccessToken();
        let token = await accessToken.token;

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                ...CONSTANTS.auth,
                accessToken: token,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            ...CONSTANTS.mailOptions,
            text: 'This is a test mail from mail-reader.js gmail api'
        };

        const result = await transport.sendMail(mailOptions);
        res.send(result);


    }
    catch(error){
        console.log(error);
        req.send(error);
    }
}

async function getUser(req, res){
    return await omniRead(`/profile`, req, res);
}

async function getMails(req, res){
    return await omniRead(`/threads?maxResults=100`, req, res);
}

async function getDrafts(req, res){
    return await omniRead(`/drafts`, req, res);
}

async function readMail(req, res){
    console.log(req);
    return await omniRead(`/messages/${req.params.messageId}`, req, res);
}

async function omniRead(path, req, res){
    try{
        const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}${path}`;
        const {token} = await oAuth2Client.getAccessToken();
        const config = createConfig(url, token);
        const response = await axios(config);
        res.json(response.data);

        return response.data.messages || [];
    }
    catch(error){
        console.log(error);
        res.send(error);
        return [];
    }
}



module.exports = {
    getUser,
    getMails,
    getDrafts,
    readMail,
    sendMail
}