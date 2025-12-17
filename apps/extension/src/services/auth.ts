interface AuthResponse {
  token: string;
  email: string;
}

class AuthService {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly EMAIL_KEY = 'user_email';

  public static async signIn(): Promise<AuthResponse> {
    try {
      // Get the auth token using Chrome's identity API
      const token = await this.getAuthToken();
      
      // Get user info using the token
      const userInfo = await this.getUserInfo(token);
      
      // Store the auth data
      await this.storeAuthData(token, userInfo.email);
      
      return {
        token,
        email: userInfo.email
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  private static async getAuthToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken(
        { 
          interactive: true
        },
        (token) => {
          if (chrome.runtime.lastError) {
            console.error('Auth Error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else if (!token) {
            reject(new Error('No token received'));
          } else {
            resolve(token);
          }
        }
      );
    });
  }

  private static async getUserInfo(token: string): Promise<{ email: string }> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    return response.json();
  }

  private static async storeAuthData(token: string, email: string): Promise<void> {
    await chrome.storage.local.set({
      [this.TOKEN_KEY]: token,
      [this.EMAIL_KEY]: email,
    });
  }

  public static async isAuthenticated(): Promise<boolean> {
    const result = await chrome.storage.local.get([this.TOKEN_KEY]);
    return !!result[this.TOKEN_KEY];
  }

  public static async signOut(): Promise<void> {
    await chrome.storage.local.remove([this.TOKEN_KEY, this.EMAIL_KEY]);
  }

  public static async subscribeToNewsletter(email: string): Promise<void> {
    // Replace with your newsletter subscription endpoint
    const NEWSLETTER_API = 'https://api.yourdomain.com/subscribe';
    
    try {
      const response = await fetch(NEWSLETTER_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe to newsletter');
      }
    } catch (error) {
      console.error('Newsletter subscription failed:', error);
      throw error;
    }
  }
}

export default AuthService;
