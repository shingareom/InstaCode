import * as vscode from 'vscode';
import axios from 'axios';

const CLIENT_ID = 'YOUR_CLIENT_ID'; // Replace with your Instagram Client ID
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET'; // Replace with your Instagram Client Secret
const REDIRECT_URI = 'https://localhost'; // Replace with your redirect URI

export function activate(context: vscode.ExtensionContext) {
    // Command: Login to Instagram
    let loginCommand = vscode.commands.registerCommand('instagramReelsViewer.login', async () => {
        const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user_profile,user_media&response_type=code`;
        vscode.env.openExternal(vscode.Uri.parse(authUrl));

        const code = await vscode.window.showInputBox({ prompt: 'Enter the authorization code from Instagram' });
        if (!code) {
            vscode.window.showErrorMessage('No code provided.');
            return;
        }

        try {
            const response = await axios.post('https://api.instagram.com/oauth/access_token', null, {
                params: {
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    redirect_uri: REDIRECT_URI,
                    code: code,
                },
            });

            const accessToken = response.data.access_token;
            await context.secrets.store('instagramToken', accessToken);
            vscode.window.showInformationMessage('Logged in successfully!');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to log in. Please check your credentials and try again.');
            console.error(error);
        }
    });

    // Register the sidebar view
    const sidebarProvider = new InstagramReelsSidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'instagramReelsViewer.sidebar',
            sidebarProvider
        )
    );

    context.subscriptions.push(loginCommand);
}

class InstagramReelsSidebarProvider implements vscode.WebviewViewProvider {
    constructor(private readonly _extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body, html {
                        margin: 0;
                        padding: 0;
                        height: 100%;
                        overflow: hidden;
                    }
                    #reels-container {
                        height: 100vh;
                        overflow-y: scroll;
                    }
                    iframe {
                        width: 100%;
                        height: 100vh;
                        border: none;
                    }
                </style>
            </head>
            <body>
                <div id="reels-container">
                    <!-- Reels will be loaded here -->
                </div>
                <script>
                    async function fetchReels() {
                        try {
                            const response = await fetch('https://graph.instagram.com/me/media?fields=id,media_type,media_url,permalink&access_token=YOUR_ACCESS_TOKEN');
                            if (!response.ok) {
                                throw new Error('Failed to fetch reels.');
                            }
                            const data = await response.json();
                            return data.data.filter(item => item.media_type === 'VIDEO');
                        } catch (error) {
                            console.error('Error fetching reels:', error);
                            return [];
                        }
                    }

                    async function loadReels() {
                        const reels = await fetchReels();
                        const container = document.getElementById('reels-container');
                        if (reels.length === 0) {
                            container.innerHTML = '<p>No reels found.</p>';
                            return;
                        }

                        reels.forEach(reel => {
                            const iframe = document.createElement('iframe');
                            iframe.src = reel.permalink + 'embed';
                            iframe.width = '100%';
                            iframe.height = '100%';
                            iframe.style.border = 'none';
                            container.appendChild(iframe);
                        });
                    }

                    loadReels();
                </script>
            </body>
            </html>
        `;
    }
}

export function deactivate() {}