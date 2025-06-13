import { Router } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const router = Router();

// Configuration - these should be in environment variables
const CLIENT_ID = '86pg9onlum0hah';
const CLIENT_SECRET = 'WPL_AP1.9BuYogv2pcEsswsG.PdCw5Q==';
const REDIRECT_URI = 'https://devcrm20.abacasys.com:9100/linkedin/callback';
const APP_SCHEME = "myapp"


const client = jwksClient({
  jwksUri: 'https://www.linkedin.com/oauth/v2/keys'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

router.route("/callback").get(async (req, res) => {
  console.log("🔹 Callback URL hit");
  const { code, error, error_description } = req.query;

  if (error) {
    console.error("❌ LinkedIn Error:", error, error_description);
    return res.status(400).json({ error, error_description });
  }

  if (!code) {
    console.error("❌ Authorization code missing");
    return res.status(400).json({ error: "Authorization code missing" });
  }

  console.log("✅ Authorization Code Received:", code);

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post("https://www.linkedin.com/oauth/v2/accessToken", null, {
      params: {
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      },
      headers: { 
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
    });

    const { id_token, access_token } = tokenResponse.data;
    console.log("✅ Token Response received");

    // Verify and decode the ID token
    jwt.verify(id_token, getKey, { algorithms: ["RS256"] }, (err, decoded) => {
      if (err) {
        console.error("❌ Invalid ID token:", err);
        return res.status(400).json({ error: "Invalid ID token" });
      }

      console.log("🔹 Token decoded successfully");

      const userData = {
        email: decoded.email,
        firstName: decoded.given_name,
        lastName: decoded.family_name,
        picture: decoded.picture,
        exp: decoded.exp,
        aud: decoded.aud,
        accessToken: access_token,
      };

      const encodedUserData = encodeURIComponent(JSON.stringify(userData));
      const deepLinkUrl = `${APP_SCHEME}://linkedin/callback?user=${encodedUserData}`;

      // Detect device type from User-Agent header
      const userAgent = req.headers["user-agent"] || "";
      const isIOS = /iphone|ipad|ipod/i.test(userAgent);
      const isAndroid = /android/i.test(userAgent);

      if (isIOS) {
        // iOS-specific handling
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Redirecting...</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                margin: 0; 
                padding: 20px; 
                text-align: center; 
                background-color: #f5f5f7;
                color: #1d1d1f;
              }
              .container {
                max-width: 400px;
                margin: 0 auto;
                padding: 40px 20px;
              }
              .button { 
                background-color: #0A66C2; 
                color: white; 
                padding: 14px 28px; 
                border-radius: 8px; 
                text-decoration: none; 
                display: inline-block; 
                margin-top: 20px; 
                font-weight: 600;
                font-size: 16px;
                transition: background-color 0.2s;
              }
              .button:hover {
                background-color: #084d94;
              }
              .status {
                background-color: white;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .loading {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #0A66C2;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
            <script>
              let attemptCount = 0;
              const maxAttempts = 3;
              
              function updateStatus(message) {
                document.getElementById('status-message').innerHTML = message;
              }
              
              function openApp() {
                attemptCount++;
                updateStatus('<div class="loading"></div><br>Attempting to open app... (Attempt ' + attemptCount + ')');
                
                // Store data in localStorage as fallback
                try {
                  localStorage.setItem('linkedInUserData', '${encodedUserData}');
                } catch(e) {
                  console.log('localStorage not available');
                }
                
                // Primary method: direct navigation
                window.location.href = "${deepLinkUrl}";
                
                // Fallback: iframe method
                setTimeout(function() {
                  try {
                    var iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.style.width = '1px';
                    iframe.style.height = '1px';
                    iframe.src = "${deepLinkUrl}";
                    document.body.appendChild(iframe);
                    
                    // Remove iframe after attempt
                    setTimeout(function() {
                      document.body.removeChild(iframe);
                    }, 1000);
                  } catch(e) {
                    console.log('Iframe method failed');
                  }
                }, 1000);
                
                // Show manual options after delay
                setTimeout(function() {
                  if (attemptCount >= maxAttempts) {
                    updateStatus('Having trouble opening the app automatically?');
                    document.getElementById('manual-return').style.display = 'block';
                  } else {
                    // Try again
                    setTimeout(openApp, 2000);
                  }
                }, 3000);
              }
              
              // Start the process when page loads
              window.addEventListener('load', function() {
                setTimeout(openApp, 500);
              });
              
              // Handle page visibility change (user returns to browser)
              document.addEventListener('visibilitychange', function() {
                if (!document.hidden && attemptCount < maxAttempts) {
                  setTimeout(openApp, 1000);
                }
              });
            </script>
          </head>
          <body>
            <div class="container">
              <h2>LinkedIn Sign-In Successful! ✅</h2>
              
              <div class="status">
                <p id="status-message">Preparing to redirect to app...</p>
              </div>
              
              <div id="manual-return" style="display:none">
                <p><strong>Manual Options:</strong></p>
                <a href="${deepLinkUrl}" class="button" onclick="updateStatus('Opening app...')">Open App</a>
                
                <div style="margin-top: 30px; font-size: 14px; color: #666;">
                  <p>If the app doesn't open:</p>
                  <ol style="text-align: left; display: inline-block;">
                    <li>Make sure the app is installed</li>
                    <li>Open the app manually</li>
                    <li>Your login data will be available</li>
                  </ol>
                </div>
              </div>
            </div>
          </body>
          </html>
        `);
      } else if (isAndroid) {
        // Android-specific handling
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Redirecting...</title>
            <style>
              body { 
                font-family: 'Roboto', system-ui, sans-serif; 
                margin: 0; 
                padding: 20px; 
                text-align: center; 
                background-color: #fafafa;
                color: #212121;
              }
              .container {
                max-width: 400px;
                margin: 0 auto;
                padding: 40px 20px;
              }
              .button { 
                background-color: #0A66C2; 
                color: white; 
                padding: 12px 24px; 
                border-radius: 4px; 
                text-decoration: none; 
                display: inline-block; 
                margin-top: 20px; 
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .status {
                background-color: white;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
            </style>
            <script>
              function openApp() {
                // Store data for fallback
                try {
                  localStorage.setItem('linkedInUserData', '${encodedUserData}');
                } catch(e) {}
                
                // Android Intent approach
                window.location.href = "${deepLinkUrl}";
                
                // Show manual button after delay
                setTimeout(function() {
                  document.getElementById('manual-return').style.display = 'block';
                }, 2000);
              }
              
              window.addEventListener('load', openApp);
            </script>
          </head>
          <body>
            <div class="container">
              <h2>Login Successful! 🎉</h2>
              
              <div class="status">
                <p>Redirecting to app...</p>
              </div>
              
              <div id="manual-return" style="display:none">
                <p>If you're not redirected automatically:</p>
                <a href="${deepLinkUrl}" class="button">Open App</a>
              </div>
            </div>
          </body>
          </html>
        `);
      } else {
        // Web/Desktop fallback
        res.send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>LinkedIn Authentication Successful</title>
            <style>
              body { 
                font-family: system-ui, -apple-system, sans-serif; 
                margin: 0; 
                padding: 40px 20px; 
                text-align: center; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                background: white;
                color: #333;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                max-width: 500px;
              }
              .button { 
                background-color: #0A66C2; 
                color: white; 
                padding: 14px 28px; 
                border-radius: 6px; 
                text-decoration: none; 
                display: inline-block; 
                margin-top: 20px; 
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Authentication Successful! ✅</h1>
              <p>Your LinkedIn account has been successfully connected.</p>
              <p>You can now close this window and return to the application.</p>
              
              <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                <h3>For Mobile Users:</h3>
                <a href="${deepLinkUrl}" class="button">Open Mobile App</a>
                <p style="font-size: 14px; margin-top: 10px; color: #666;">
                  Click the button above to return to the mobile app
                </p>
              </div>
            </div>
          </body>
          </html>
        `);
      }
    });
  } catch (error) {
    console.error("❌ Error:", error?.response?.data || error.message);
    
    // Send user-friendly error page
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Authentication Error</title>
        <style>
          body { 
            font-family: system-ui, sans-serif; 
            margin: 0; 
            padding: 40px 20px; 
            text-align: center; 
            background-color: #fee; 
            color: #c33;
          }
          .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>❌ Authentication Failed</h2>
          <p>There was an error processing your LinkedIn authentication.</p>
          <p>Please try again or contact support if the problem persists.</p>
          <button onclick="window.close()" style="margin-top: 20px; padding: 10px 20px; background: #0A66C2; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Close Window
          </button>
        </div>
      </body>
      </html>
    `);
  }
});

// API endpoint to check auth status and retrieve stored user data
router.get("/authcheck", (req, res) => {
  res.json({ 
    message: "Use this endpoint in your app to retrieve auth status",
    timestamp: new Date().toISOString(),
    status: "ready"
  });
});

export default router;