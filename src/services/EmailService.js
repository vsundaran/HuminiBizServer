// This class is based on the user-provided implementation logic
const axios = require('axios');
const qs = require('qs');

class EmailService {
    constructor() {
        this.clientId = process.env.MS_CLIENT_ID;
        this.clientSecret = process.env.MS_CLIENT_SECRET;
        this.tenantId = process.env.MS_TENANT_ID;
        this.senderEmail = process.env.MS_SENDER_EMAIL || 'no.reply@arus.co.in';
    }

    async getAccessToken() {
        try {
            const data = qs.stringify({
                client_id: this.clientId,
                scope: 'https://graph.microsoft.com/.default',
                client_secret: this.clientSecret,
                grant_type: 'client_credentials'
            });

            const config = {
                method: 'post',
                url: `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: data
            };

            const response = await axios(config);
            return response.data.access_token;
        } catch (error) {
            console.error('Error getting access token:', error.response ? error.response.data : error.message);
            throw new Error('Failed to get access token');
        }
    }

    async sendMail(email, subject, content) {
        try {
            const accessToken = await this.getAccessToken();

            const data = JSON.stringify({
                "message": {
                    "subject": subject,
                    "body": {
                        "contentType": "HTML",
                        "content": content
                    },
                    "from": {
                        "emailAddress": {
                            "address": this.senderEmail
                        }
                    },
                    "toRecipients": [
                        {
                            "emailAddress": {
                                "address": email
                            }
                        }
                    ]
                },
                "saveToSentItems": "false"
            });

            const config = {
                method: 'post',
                url: `https://graph.microsoft.com/v1.0/users/${this.senderEmail}/sendMail`,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                data: data
            };

            await axios(config);
            console.log(`Email sent successfully to ${email}`);
            return { success: true };
        } catch (error) {
            console.error('Error sending email:', error.response ? error.response.data : error.message);
            return { success: false, error: error.message };
        }
    }

    async sendOTP(email, otp) {
        const subject = "Your OTP for Humini Biz";
        const content = `<p>Hello,</p><p>Your OTP is <strong>${otp}</strong>.</p><p>This OTP will expire in 5 minutes.</p>`;
        return this.sendMail(email, subject, content);
    }
}

module.exports = new EmailService();
