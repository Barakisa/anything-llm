require("dotenv").config({ path: `../../../../../.env.development` });

const auth = {
    type: 'OAuth2',
    user: process.env.USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN
}

const mailOptions = {
    from: process.env.USER,
    to: process.env.USER,
    subject: 'Gmail api test',
}

module.exports ={ auth, mailOptions }