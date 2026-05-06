"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHtmlTemplate = void 0;
/**
 * Generates a standardized HTML email template
 *
 * @param title The main subject/title of the email
 * @param greetings Personal greeting (e.g., "Hello John,")
 * @param content The main message body
 * @returns HTML string
 */
const getHtmlTemplate = (title, greetings, content, logoUrl = 'https://schooling.social/SchoolingLogo.png') => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            color: #1a1a1a; 
            margin: 0; 
            padding: 0; 
            background-color: #f8fafc; 
        }
        .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: #ffffff; 
            border-radius: 24px; 
            overflow: hidden; 
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); 
        }
        .header { 
            background-color: #0f172a; 
            background: linear-gradient(135deg, #111827 0%, #020617 100%);
            padding: 40px 20px; 
            text-align: center; 
        }
        .header img {
            max-height: 55px;
            width: auto;
            margin-bottom: 24px;
            display: inline-block;
        }
        .header h1 { 
            color: #ffffff; 
            margin: 0; 
            font-size: 20px; 
            font-weight: 800; 
            text-transform: uppercase; 
            letter-spacing: 2px; 
        }
        .content { 
            padding: 40px 30px; 
        }
        .greetings { 
            font-size: 18px; 
            font-weight: 700; 
            color: #0f172a; 
            margin-bottom: 16px; 
        }
        .message { 
            font-size: 16px; 
            color: #475569; 
            margin-bottom: 32px; 
            white-space: pre-line;
        }
        .footer { 
            background-color: #f1f5f9; 
            padding: 24px; 
            text-align: center; 
            border-top: 1px solid #e2e8f0; 
        }
        .footer p { 
            font-size: 11px; 
            color: #64748b; 
            margin: 4px 0; 
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .brand { 
            color: #0066FF; 
            font-weight: 800; 
        }
        @media only screen and (max-width: 600px) {
            .container { margin: 0; border-radius: 0; }
            .content { padding: 30px 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="Schooling Social" />
            <h1>${title}</h1>
        </div>
        <div class="content">
            <div class="greetings">${greetings}</div>
            <div class="message">${content}</div>
        </div>
        <div class="footer">
            <p>Sent with excellence from <span class="brand">Schooling Social</span></p>
            <p>&copy; ${new Date().getFullYear()} Schooling. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
};
exports.getHtmlTemplate = getHtmlTemplate;
